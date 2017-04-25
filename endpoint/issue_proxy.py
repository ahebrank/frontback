#!/usr/bin/env python
import io
import json
import argparse
from flask import Flask, request, abort, jsonify, send_from_directory
from flask_cors import CORS, cross_origin
from api_helper import Api

def create_app(config, debug=False):
    app = Flask(__name__)
    # allow from anywhere
    CORS(app)
    app.debug = debug
    try:
        repos_data = json.loads(io.open(config, 'r').read())
    except:
        print("Error opening repos file %s -- check file exists and is valid json" % config)
        raise

    @app.route("/", methods=['GET', 'POST'])
    def index():
        if request.method == "GET":
            abort(404)
        elif request.method == "POST":
            payload = request.get_json()

            if not payload:
                return set_resp({'status': 'request not json', 'received': request.data}, 400)

            # common for events
            repo_id = payload.get('repoID')
            repo_config = repos_data.get(repo_id)

            if not repo_config:
                return set_resp({'status': 'repo not found in config'}, 400)

            # get API based on repo identifier
            api_helper = Api()
            api = api_helper.match_api_from_id(repo_id)

            app_key = repo_config.get('app_key')
            private_token = repo_config.get('private_token')
            assignee_id = repo_config.get('assignee_id')
            tags = repo_config.get('tags')
            # tags may be a string or an array
            if tags and not isinstance(tags, list):
                tags = [tags]

            if not private_token:
                abort(403)

            this_api = api(repo_id, private_token, app_key)

            # try to lookup a username
            if assignee_id and not assignee_id.isdigit():
                assignee_id = this_api.lookup_user_id(assignee_id)

            title = payload.get('title')
            body = payload.get('note')

            if not title:
                title = body

            # attach the image
            img = payload.get('img')
            if img:
                file_url = this_api.attach_image(img)
                # if URL returned, handle with a body attachment
                if file_url:
                    body += api_helper.append_body(file_url)

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
                submitter_id = this_api.get_username(email)
                meta += api_helper.append_body('Submitted by ' + submitter_id)

            if this_api.create_issue(title, body, meta, assignee_id, submitter_id, tags):
                return set_resp({'status': 'issue created'})

            # issue couldn't be created
            abort(500)


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

    this_app = create_app(args.config, args.debug)

    this_app.run(host="0.0.0.0", port=port_number)
