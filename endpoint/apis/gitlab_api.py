from .base_api import BaseApi
from urllib.parse import urlparse, quote_plus

class GitlabApi(BaseApi):
    api_version = "v4"

    project = None
    project_id = None

    def __init__(self, homepage, token, app_key = False):
        parsed_url = urlparse(homepage)
        super(GitlabApi, self).__init__(parsed_url.scheme + "://" + parsed_url.netloc + "/api/" + self.api_version, homepage, {"private_token": token})

    def get_project_users(self):
        users = []
        # TODO: deal with pagination for really big projects
        project_users = self.get("/projects/%s/members?per_page=100" % (self.lookup_project_id()))
        if len(project_users) > 0:
            users += project_users
        # find members of project namespace
        project = self.get_project()
        namespace = project['namespace']['id']
        # TODO: deal with pagination for really big groups
        group_users = self.get("/groups/%s/members?per_page=100" % (namespace))
        if len(group_users) > 0:
            users += group_users
        # is this a subgroup? get members of parent group as well
        if 'parent_id' in project['namespace'] and project['namespace']['parent_id'] is not None:
            group_users = self.get("/groups/%s/members?per_page=100" % (project['namespace']['parent_id']))
            if len(group_users) > 0:
                users += group_users
        # shared groups
        if 'shared_with_groups' in project:
            for group in project['shared_with_groups']:
                group_users = self.get("/groups/%s/members?per_page=100" % (group['group_id']))
                if len(group_users) > 0:
                    users += group_users

        if len(users) > 0:
            return sorted(set([user['username'] for user in users]), key=lambda s: s.lower())
        return []

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
        if self.project is None:
            parsed_url = urlparse(self.homepage)
            project_name = quote_plus(parsed_url.path[1:])
            self.project = self.get("/projects/" + project_name)
        return self.project

    def lookup_project_id(self):
        if self.project_id is None:
            project = self.get_project()
            if "id" in project:
                self.project_id = project['id']
        return self.project_id

    def create_issue(self, title, body, meta, assignee_id=None, submitter_id=None, tags=None):
        # collapse metadata into issue description
        body = body + "\n\n" + meta

        data = {
            'id': self.lookup_project_id(),
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
            'id': self.lookup_project_id(),
            'issue_id': issue_id,
            'body': comment
        }
        return self.post("/projects/{id}/issues/{issue_id}/notes".format(**data), data)

    def attach_image(self, img):
        file = self.format_image(img)
        data = {
            'id': self.lookup_project_id()
        }
        result = self.post("/projects/{id}/uploads".format(**data), data, file)
        file_md = result.get('markdown')
        if file_md:
            return file_md
        return False
