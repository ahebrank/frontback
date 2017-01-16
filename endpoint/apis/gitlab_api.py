from urlparse import urlparse
from urllib import quote_plus
import requests
import json
import binascii
from email.utils import parseaddr

class GitlabApi:
    base_url = None
    homepage = None
    token = None
    project_id = None

    def __init__(self, homepage, token, app_key):
        self.token = token
        o = urlparse(homepage)
        self.base_url = o.scheme + "://" + o.netloc + "/api/v3"
        self.homepage = homepage
        self.project_id = self.lookup_project_id()

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
        return json.loads(r.text)

    def get(self, endpoint):
        r = requests.get(self.get_url(endpoint))
        return json.loads(r.text)

    def lookup_username(self, email):
        users = self.get("/users?search=" + email)
        if len(users) == 1:
            return users[0]['username']
        return False;

    def lookup_user_id(self, username):
        if username.startswith("@"):
            username = username[1:]
        users = self.get("/users?username=" + username)
        if len(users) == 1:
            return users[0]['id']
        return False

    def get_project(self):
        o = urlparse(self.homepage)
        project_name = quote_plus(o.path[1:])
        return self.get("/projects/" + project_name)

    def lookup_project_id(self):
        project = self.get_project()
        if "id" in project:
            return project['id']
        return None

    def create_issue(self, title, body, assignee_id = None, submitter_id = None):
        data = {
            'id': self.project_id,
            'title': title,
            'description': body
        }
        if assignee_id:
            data['assignee_id'] = assignee_id
        success = self.post("/projects/{id}/issues".format(**data), data)
        iid = success.get('iid')
        if iid:
            return True
        return False

    def comment_on_issue(self, issue_id, comment):
        data = {
            'id': self.project_id,
            'issue_id': issue_id,
            'body': comment
        }
        return self.post("/projects/{id}/issues/{issue_id}/notes".format(**data), data)

    def attach_image(self, img):
        prefix = "data:image/png;base64,"
        if not img.startswith(prefix):
            return False
        img = img[len(prefix):]
        file = binascii.a2b_base64(img)
        data = {
            'id': self.project_id
        }
        result = self.post("/projects/{id}/uploads".format(**data), data, file)
        file_md = result.get('markdown')
        if file_md:
            return file_md
        return False
        
    def get_username(self, email):
        if email.startswith('@'):
            return raw_email
        parsed_email = parseaddr(email)
        if parsed_email[1]:
            if "@" in parsed_email[1]:
                return "@" + gl.lookup_username(parsed_email[1])
            else:
                return "@" + raw_email
        return False
