from urlparse import urlparse
import requests
import json

class GitlabApi:
    base_url = None
    token = None

    def __init__(self, homepage, token):
        self.token = token
        o = urlparse(homepage)
        self.base_url = o.scheme + "://" + o.netloc + "/api/v3/"

    def get_url(self, endpoint):
        if '?' in endpoint:
            parameter_delmiter = "&"
        else:
            parameter_delmiter = "?"
        url = self.base_url + endpoint + parameter_delmiter + "private_token=" + self.token
        return url

    def post(self, endpoint, data):
        r = requests.post(self.get_url(endpoint), data=data)
        return json.loads(r.text)

    def get(self, endpoint):
        r = requests.get(self.get_url(endpoint))
        return json.loads(r.text)

    def lookup_username(self, email):
        users = self.get("/users?search=" + email)
        if len(users) == 1:
            return users[0]['username']
        return False;

    def lookup_project_id(self, homepage):
        # TODO
        return None

    def create_issue(self, project_id, title, body, assignee_id = None):
        data = {
            'id': project_id,
            'title': title,
            'description': body
        }
        if (assignee_id):
            data['assignee_id'] = assignee_id
        return self.post("/projects/{id}/issues".format(**data), data)

    def comment_on_issue(self, project_id, issue_id, comment):
        data = {
            'id': project_id,
            'issue_id': issue_id,
            'body': comment
        }
        return self.post("/projects/{id}/issues/{issue_id}/notes".format(**data), data)

    def upload_file(self, project_id, file):
        data = {
            'id': project_id,
            'file': file
        }
        return self.post("/projects/{id}/uploads".format(**data), data)

    def append_body(self, line):
        return "\n\n" + line