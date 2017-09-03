from apis.gitlab_api import GitlabApi
from apis.trello_api import TrelloApi

class Api:
    def match_api_from_id(self, repoId):
        if "gitlab.com" in repoId:
            return GitlabApi
        if "trello.com" in repoId:
            return TrelloApi
        return None

    def append_body(self, line):
        return "\n\n" + line

    def try_to_parse(self, email):
        if email.startswith('@'):
            return email
        parsed = parseaddr(email)
        if "@" in parsed[1]:
            return parsed[1]
