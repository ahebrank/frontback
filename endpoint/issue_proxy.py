#!/usr/bin/env python3
import io
import json
import argparse
import time
from flask import Flask, request, abort, jsonify, send_from_directory
from flask_cors import CORS, cross_origin
from api_helper import Api
from concurrent.futures import ThreadPoolExecutor

def create_app(config, asynchronous=False, debug=False):
    app = Flask(__name__)
    executor = ThreadPoolExecutor(2)

    # allow from anywhere
    CORS(app)
    app.debug = debug
    try:
        repos_data = json.loads(io.open(config, 'r').read())
    except:
        print("Error opening repos file %s -- check file exists and is valid json" % config)
        raise
    if debug:
        if asynchronous:
            print("Async API mode")

    @app.route("/", methods=['GET', 'POST'])
    def index():
        start_time = time.time()
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
                return set_resp({'status': 'repo not found in config', 'repo_id': repo_id}, 400)

            if debug:
                print("Found config for %s (%s): " % (repo_id, get_elapsed_time(start_time)))
                print(repo_config)

            private_token = repo_config.get('private_token')
            if not private_token:
                abort(403)

            # run the API
            if asynchronous:
                executor.submit(
                    issue_worker,
                    payload, repo_id, repo_config, start_time
                )
            else:
                if issue_worker(payload, repo_id, repo_config, start_time):
                    if debug:
                        print("Returning sync OK (%s)" % (get_elapsed_time(start_time)))
                    return set_resp({'status': 'submitted'}, 200)
                else:
                    if debug:
                        print("Returning 500 error (%s)" % (get_elapsed_time(start_time)))
                    abort(500)

            if debug:
                print("Returning async OK (%s)" % (get_elapsed_time(start_time)))
            return set_resp({'status': 'submitted'})
    
    def issue_worker(payload, repo_id, repo_config, start_time):
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

        if debug:
            print("Loading API (%s)..." % (get_elapsed_time(start_time)))
        this_api = api(repo_id, private_token, app_key)
        if debug:
            print("Loaded API handler (%s)" % (get_elapsed_time(start_time)))

        # try to lookup a username
        if assignee_id and not assignee_id.isdigit():
            print("Looking for user: %s (%s)..." % (assignee_id, get_elapsed_time(start_time)))
            assignee_id = this_api.lookup_user_id(assignee_id)
            if debug:
                print("Found user %s (%s)" % (assignee_id, get_elapsed_time(start_time)))

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
        dev_url_replace = repo_config.get('dev_url_replace')
        if dev_url_replace:
            dev_urls = []
            dev_url_f_r = dev_url_replace.split('|')
            f_url = dev_url_f_r.pop(0)
            for r_url in dev_url_f_r:
                dev_urls.append(url.replace(f_url, r_url))
            if len(dev_urls):
                url += ' (' + ' , '.join(dev_urls) + ')'
        meta = 'URL: ' + url        

        browser = payload.get('browser')
        if browser:
            meta += api_helper.append_body('Useragent: ' + browser.get('userAgent'))
            meta += api_helper.append_body('Platfom: ' + browser.get('platform'))
            meta += api_helper.append_body('Window size: ' + browser.get('windowDims'))

        # look up the submitter
        email = payload.get('email')
        submitter_id = None
        if email:
            submitter_id = this_api.get_username(email)
            meta += api_helper.append_body('Submitted by ' + submitter_id)

        if this_api.create_issue(title, body, meta, assignee_id, submitter_id, tags):
            if debug:
                print("Created issue (%s)" % (get_elapsed_time(start_time)))
            return True
        return False

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
    return resp, status

def get_elapsed_time(start_time):
    return "%0.2f sec" % (time.time() - start_time)

if __name__ == "__main__":

    parser = argparse.ArgumentParser(description="frontback gitlab proxy")
    parser.add_argument("-c", "--config", action="store", help="path to repos configuration", required=True)
    parser.add_argument("-p", "--port", action="store", help="server port", required=False, default=8080)
    parser.add_argument("--async", action="store_true", help="enable asynchronous issue creation", required=False, default=False)
    parser.add_argument("--debug", action="store_true", help="enable debug output", required=False, default=False)

    args = parser.parse_args()
    port_number = int(args.port)

    this_app = create_app(args.config, args.async, args.debug)

    this_app.run(host="0.0.0.0", port=port_number, threaded=True)
