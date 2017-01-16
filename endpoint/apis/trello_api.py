from urlparse import urlparse
from urllib import quote_plus
import requests
import json
import binascii

class TrelloApi:
    base_url = None
    homepage = None
    token = None
    list_id = None
    image_to_upload = False
    
    # name of the incoming issue list
    trello_list = "Feedback"
    
    # to get a user token:
    # https://trello.com/1/connect?key=[key]&name=Frontback&response_type=token&scope=read,write

    def __init__(self, homepage, token, key):
        self.key = key
        self.token = token
        self.base_url = "https://api.trello.com/"
        self.homepage = homepage
        self.list_id = self.lookup_list_id()

    def get_url(self, endpoint):
        if '?' in endpoint:
            parameter_delmiter = "&"
        else:
            parameter_delmiter = "?"
        url = self.base_url + endpoint + parameter_delmiter + "key=" + self.key + "&token=" + self.token
        return url

    def post(self, endpoint, data, file = None):
        if file:
            r = requests.post(self.get_url(endpoint), data=data, files={'file': ('screenshot.png', file, 'image/png')})
        else:
            r = requests.post(self.get_url(endpoint), data=data)
        return json.loads(r.text)

    def get(self, endpoint):
        r = requests.get(self.get_url(endpoint))
        return json.loads(r.text)

    def lookup_username(self, email):
        return False;

    def lookup_user_id(self, username):
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

    def create_issue(self, title, body, assignee_id = None):
        data = {
            'idList': self.list_id,
            'name': title,
            'desc': body,
            'pos': 'top'
        }
        if assignee_id:
            data['idMembers'] = assignee_id
        result = self.post("1/cards", data)
        if result.get('id'):
            i = result.get('id')
            if self.image_to_upload:
                self.upload_image_to_card(i)
            return True
        return False

    def attach_image(self, img):
        prefix = "data:image/png;base64,"
        if not img.startswith(prefix):
            return False
        img = img[len(prefix):]
        # hang on to it for later
        self.image_to_upload = binascii.a2b_base64(img)
        return False
        
    def upload_image_to_card(self, card_id):
        data = {}
        result = self.post("1/cards/" + card_id + '/attachments', data, self.image_to_upload)
        if result.get('id'):
            return True
        return False
        
    def get_username(self, raw_email, parsed_email):
        return False
