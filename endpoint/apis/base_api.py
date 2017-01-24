from urlparse import urlparse
from urllib import quote_plus
import requests
import json
import binascii
from email.utils import parseaddr
import re

class BaseApi:
    
    base_url = None
    homepage = None
    token = None
    append_parameters = ""
    
    # construct a URL
    def get_url(self, endpoint):
        if '?' in endpoint:
            parameter_delimiter = "&"
        else:
            parameter_delimiter = "?"
        url = self.base_url + endpoint + parameter_delimiter + self.append_parameters
        return url
        
    # base poster
    def post(self, endpoint, data, file = None):
        if file:
            r = requests.post(self.get_url(endpoint), data=data, files={'file': ('screenshot.png', file, 'image/png')})
        else:
            r = requests.post(self.get_url(endpoint), data=data)
        return json.loads(r.text)
    
    # base getter
    def get(self, endpoint):
        r = requests.get(self.get_url(endpoint))
        return json.loads(r.text)

    # return a list of @mentions from a text field
    def find_mentions(body):
        r = re.compile(r"(@\w+)", re.MULTILINE)
        return r.findall(body)
        
