import requests
import json
import binascii
import re

class BaseApi(object):
    
    base_url = None
    homepage = None
    append_parameters = ""
    
    def __init__(self, base_url, homepage, creds):
        self.base_url = base_url
        self.homepage = homepage
        self.append_parameters = "&".join(["%s=%s" % (k, creds[k]) for k in creds if creds[k]])
    
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
        
    # parse the image from the frontend
    def format_image(self, img):
        prefix = "data:image/png;base64,"
        if not img.startswith(prefix):
            return False
        img = img[len(prefix):]
        return binascii.a2b_base64(img)

    # return a list of @mentions from a text field
    def find_mentions(self, body):
        r = re.compile(r"(@\w+)", re.MULTILINE)
        return r.findall(body)
        
