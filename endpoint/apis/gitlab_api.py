from base_api import BaseApi
from urlparse import urlparse
from urllib import quote_plus

class GitlabApi(BaseApi):
    project_id = None

    def __init__(self, homepage, token, app_key):
        parsed_url = urlparse(homepage)
        super(GitlabApi, self).__init__(parsed_url.scheme + "://" + parsed_url.netloc + "/api/v3", homepage, {"private_token": token})
        self.project_id = self.lookup_project_id()

    def lookup_username(self, email):
        users = self.get("/users?search=" + email)
        if len(users) == 1:
            return users[0]['username']
        return False

    def lookup_user_id(self, username):
        if username.startswith("@"):
            username = username[1:]
        users = self.get("/users?username=" + username)
        if len(users) == 1:
            return users[0]['id']
        return False

    def get_project(self):
        parsed_url = urlparse(self.homepage)
        project_name = quote_plus(parsed_url.path[1:])
        return self.get("/projects/" + project_name)

    def lookup_project_id(self):
        project = self.get_project()
        if "id" in project:
            return project['id']
        return None

    def create_issue(self, title, body, meta, assignee_id=None, submitter_id=None, tags=None):
        # collapse metadata into issue description
        body = body + "\n\n" + meta

        data = {
            'id': self.project_id,
            'title': title,
            'description': body
        }
        if assignee_id:
            data['assignee_id'] = assignee_id
        if tags:
            data['labels'] = ",".join(tags)
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
        file = self.format_image(img)
        data = {
            'id': self.project_id
        }
        result = self.post("/projects/{id}/uploads".format(**data), data, file)
        file_md = result.get('markdown')
        if file_md:
            return file_md
        return False
