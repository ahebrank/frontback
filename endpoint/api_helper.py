from apis.gitlab_api import GitlabApi
from apis.trello_api import TrelloApi

class Api:
    def matchApiFromId(self, repoId):
        if "gitlab.com" in repoId:
            return GitlabApi
        if "trello.com" in repoId:
            return TrelloApi
            
        return None
        
    def append_body(self, line):
        return "\n\n" + line
