from urlparse import urlparse
from urllib import quote_plus
import requests
import json
import binascii

class GitlabApi:
    base_url = None
    homepage = None
    token = None

    def __init__(self, homepage, token):
        self.token = token
        o = urlparse(homepage)
        self.base_url = o.scheme + "://" + o.netloc + "/api/v3"
        self.homepage = homepage

    def get_url(self, endpoint):
        if '?' in endpoint:
            parameter_delmiter = "&"
        else:
            parameter_delmiter = "?"
        url = self.base_url + endpoint + parameter_delmiter + "private_token=" + self.token
        return url

    def post(self, endpoint, data, file = None):
        if file:
            r = requests.post(self.get_url(endpoint), files={'file': ('screenshot.png', file, 'image/png')})
        else:
            r = requests.post(self.get_url(endpoint), data=data)
        print r.text
        return json.loads(r.text)

    def get(self, endpoint):
        r = requests.get(self.get_url(endpoint))
        return json.loads(r.text)

    def lookup_username(self, email):
        users = self.get("/users?search=" + email)
        if len(users) == 1:
            return users[0]['username']
        return False;

    def get_project(self):
        o = urlparse(self.homepage)
        project_name = quote_plus(o.path[1:])
        return self.get("/projects/" + project_name)

    def lookup_project_id(self):
        project = self.get_project()
        if "id" in project:
            return project['id']
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

    def upload_image(self, project_id, img):
        prefix = "data:image/png;base64,"
        if not img.startswith(prefix):
            return False
        img = img[len(prefix):]
        file = binascii.a2b_base64(img)
        data = {
            'id': project_id
        }
        return self.post("/projects/{id}/uploads".format(**data), data, file)

    def append_body(self, line):
        return "\n\n" + line