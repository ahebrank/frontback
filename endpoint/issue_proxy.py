#!/usr/bin/env python
import io
import os
import re
import sys
import json
import subprocess
import requests
from flask import Flask, request, abort, Response, jsonify, send_from_directory
import argparse
from gitlab_api import GitlabApi
from email.utils import parseaddr

repos = {}

def create_app(config, root = '/'):
    app = Flask(__name__)
    try:
        repos = json.loads(io.open(config, 'r').read())
    except:
        print "Error opening repos file %s -- check file exists and is valid json" % config
        raise
    return app

    @app.route(root, methods=['GET', 'POST'])
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

                    # try to lookup a username
                    if not assignee_id.isdigit():
                        assignee_id = gl.lookup_user_id(assignee_id)

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

                    email = payload.get('email')
                    if (email):
                        parsed_email = parseaddr(email)
                        if email.startswith('@'):
                            username = email
                        elif parsed_email[1]:
                            if "@" in parsed_email[1]:
                                username = "@" + gl.lookup_username(parsed_email[1])
                            else:
                                username = "@" + email
                        else:
                            username = False

                        if username:
                            body += gl.append_body('Submitted by ' + username)

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

    # static assets
    @app.route('/assets/<path:path>')
    def send_assets(path):
        return send_from_directory('assets', path)

    @app.errorhandler(404)
    def error404(e):
        return fail({'status': 'page not found'}, 404)

    @app.errorhandler(403)
    def error403(e):
        return fail({'status': 'no authorization'}, 403)  

def fail(msg, status):
    resp = jsonify(msg)
    resp.headers['Access-Control-Allow-Origin'] = '*'
    return resp, status

if __name__ == "__main__":

    parser = argparse.ArgumentParser(description="frontback gitlab proxy")
    parser.add_argument("-c", "--config", action="store", help="path to repos configuration", required=True)
    parser.add_argument("-p", "--port", action="store", help="server port", required=False, default=8080)
    parser.add_argument("--debug", action="store_true", help="enable debug output", required=False, default=False)
    

    args = parser.parse_args()

    port_number = int(args.port)
    app = create_app(args.config)

    if args.debug:
        app.debug = True

    app.run(host="0.0.0.0", port=port_number)
