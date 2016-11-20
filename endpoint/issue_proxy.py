#!/usr/bin/env python
import io
import os
import re
import sys
import json
import subprocess
import requests
from flask import Flask, request, abort, Response, jsonify
import argparse
from gitlab_api import GitlabApi

app = Flask(__name__)

@app.route("/", methods=['GET', 'POST'])
def index():
    resp = jsonify(status="OK")
    resp.headers['Access-Control-Allow-Origin'] = '*'

    if request.method == "GET":
        return resp
    elif request.method == "POST":
        # Store the IP address of the requester
        payload = request.get_json(force = True)

        # common for events
        repoID = payload.get('repoID')
        repoConfig = repos.get(repoID)
        if repoConfig:
            private_token = repoConfig.get('private_token')
            assignee_id = repoConfig.get('assignee_id')

            if private_token:
                gl = GitlabApi(repoID, private_token)
                project_id = gl.lookup_project_id()

                title = payload.get('title')
                body = payload.get('note')

                if not title:
                    title = body

                # attach the image
                img = payload.get('img')
                if img:
                    file = gl.upload_image(project_id, img)
                    if file:
                        file_md = file.get('markdown')
                        if file_md:
                            body += gl.append_body(file_md)

                # browser info
                url = payload.get('url')
                body += gl.append_body('URL: ' + url)
                browser = payload.get('browser')
                if browser:
                    body += gl.append_body('Useragent: ' + browser.get('userAgent'))
                    body += gl.append_body('Platform: ' + browser.get('platform'))

                body += gl.append_body('Submitted by ' + payload.get('email'))

                success = gl.create_issue(project_id, title, body, assignee_id)
                iid = success.get('iid')
                if iid:
                    resp = jsonify(**success)
                    resp.headers['Access-Control-Allow-Origin'] = '*'
                    return resp

                # issue couldn't be created
                abort(404)

        # no private token
        abort(403)


if __name__ == "__main__":

    parser = argparse.ArgumentParser(description="frontback gitlab proxy")
    parser.add_argument("-c", "--config", action="store", help="path to repos configuration", required=True)
    parser.add_argument("-p", "--port", action="store", help="server port", required=False, default=8080)
    parser.add_argument("--debug", action="store_true", help="enable debug output", required=False, default=False)
    

    args = parser.parse_args()

    port_number = int(args.port)

    REPOS_JSON_PATH = args.config
    try:
        repos = json.loads(io.open(REPOS_JSON_PATH, 'r').read())
    except:
        print "Error opening repos file %s -- check file exists and is valid json" % REPOS_JSON_PATH
        raise

    if args.debug:
        app.debug = True

    app.run(host="0.0.0.0", port=port_number)
