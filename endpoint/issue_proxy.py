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
from api_helper import Api

repos = {}

def create_app(config, debug=False):
    app = Flask(__name__)
    app.debug = debug
    try:
        repos = json.loads(io.open(config, 'r').read())
    except:
        print "Error opening repos file %s -- check file exists and is valid json" % config
        raise

    @app.route("/", methods=['GET', 'POST'])
    def index():
        if request.method == "GET":
            abort(404)
        elif request.method == "POST":
            # Store the IP address of the requester
            payload = request.get_json(force = True)

            # common for events
            repoID = payload.get('repoID')
            repoConfig = repos.get(repoID)
            
            if repoConfig:
                # get API based on repo identifier
                api_helper = Api()
                api = api_helper.match_api_from_id(repoID)
                
                app_key = repoConfig.get('app_key')
                private_token = repoConfig.get('private_token')
                assignee_id = repoConfig.get('assignee_id')
                tags = repoConfig.get('tags')
                # tags may be a string or an array
                if not isinstance(tags, list):
                    tags = [tags]

                if private_token:
                    a = api(repoID, private_token, app_key)

                    # try to lookup a username
                    if assignee_id and not assignee_id.isdigit():
                        assignee_id = a.lookup_user_id(assignee_id)

                    title = payload.get('title')
                    body = payload.get('note')

                    if not title:
                        title = body

                    # attach the image
                    img = payload.get('img')
                    if img:
                        f = a.attach_image(img)
                        # if URL returned, handle with a body attachment
                        if f:
                            body += api_helper.append_body(f)

                    # browser info
                    url = payload.get('url')
                    meta = 'URL: ' + url
                    browser = payload.get('browser')
                    if browser:
                        meta += api_helper.append_body('Useragent: ' + browser.get('userAgent'))

                    # look up the submitter
                    email = payload.get('email')
                    submitter_id = None
                    if email:
                        submitter_id = a.lookup_user_id(email)
                        meta += api_helper.append_body('Submitted by ' + email)

                    if a.create_issue(title, body, meta, assignee_id, submitter_id, tags):
                        return set_resp({'status': 'Issue created'})

                    # issue couldn't be created
                    abort(500)

                # no private token
                abort(403)

            # no repo
            abort(400)

    # static assets
    @app.route('/assets/<path:path>')
    def send_assets(path):
        return send_from_directory('assets', path)

    @app.errorhandler(404)
    def error404(e):
        return set_resp({'status': 'page not found'}, 404)

    @app.errorhandler(403)
    def error403(e):
        return set_resp({'status': 'no authorization'}, 403)

    @app.errorhandler(400)
    def error400(e):
        return set_resp({'status': 'bad request'}, 400)

    @app.errorhandler(500)
    def error500(e):
        return set_resp({'status': 'error while creating issue'}, 500)


    return app

def set_resp(msg, status = 200):
    resp = jsonify(**msg)
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
