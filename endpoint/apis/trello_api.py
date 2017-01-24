from base_api import BaseApi
from urlparse import urlparse
from urllib import quote_plus

class TrelloApi(BaseApi):
    list_id = None
    image_to_upload = False
    
    # name of the incoming issue list
    trello_list = "Feedback"
    
    # to get a user token:
    # https://trello.com/1/connect?key=[key]&name=Frontback&response_type=token&scope=read,write

    def __init__(self, homepage, token, key):
        super(TrelloApi, self).__init__("https://api.trello.com/", homepage, token, key)
        self.homepage = homepage
        self.list_id = self.lookup_list_id()

    def lookup_user_id(self, username):
        user = self.get("1/members/" + username)
        if user.get('id'):
            return user.get('id')
        return False
        
    def get_board_id(self):
        o = urlparse(self.homepage)
        short_id = quote_plus(o.path.split("/")[2])
        board = self.get("1/boards/" + short_id)
        if board.get('id'):
            return board.get('id')
        return False
        
    def get_lists(self, board):
        return self.get("1/boards/" + board + "/lists?fields=name")
        
    # find the list ID
    def lookup_list_id(self):
        board = self.get_board_id()
        if board:
            lists = self.get_lists(board)
            for l in lists:
                if l['name'] == self.trello_list:
                    return l['id']
        return False

    def create_issue(self, title, body, meta, assignee_id = None, submitter_id = None):
        data = {
            'idList': self.list_id,
            'name': title,
            'desc': body + "\n\n" + meta,
            'pos': 'top'
        }
        card_members = []
        if assignee_id:
            card_members.append(assignee_id)
        if submitter_id:
            card_members.append(submitter_id)
        if card_members:
            data['idMembers'] = ",".join(set(card_members))
            
        result = self.post("1/cards", data)
        if result.get('id'):
            i = result.get('id')
            # attach an image
            if self.image_to_upload:
                self.upload_image_to_card(i)
            # make sure @mentions in the comment trigger notifications
            mentions = self.find_mentions(body)
            if mentions:
                self.add_comment(i, "mentioning: " + ', '.join(mentions))
            return True
        return False

    def attach_image(self, img):
        # hang on to it for later
        self.image_to_upload = self.format_image(img)
        return False
        
    def upload_image_to_card(self, card_id):
        data = {}
        result = self.post("1/cards/" + card_id + '/attachments', data, self.image_to_upload)
        if result.get('id'):
            return True
        return False
        
    def add_comment(self, card_id, body):
        data = {
            'text': body
        }
        result = self.post("1/cards/" + card_id + '/actions/comments', data)
        if result.get('id'):
            return True
        return False
