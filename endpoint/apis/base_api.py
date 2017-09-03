import re
import json
import binascii
from email.utils import parseaddr
import requests

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
    def post(self, endpoint, data, file=None):
        if file:
            response = requests.post(self.get_url(endpoint), data=data, files={'file': ('screenshot.png', file, 'image/png')})
        else:
            response = requests.post(self.get_url(endpoint), data=data)
        return json.loads(response.text)

    # base getter
    def get(self, endpoint):
        response = requests.get(self.get_url(endpoint))
        return json.loads(response.text)

    # parse the image from the frontend
    def format_image(self, img):
        allowed_prefixes = ["data:image/png;base64,", "data:image/jpeg;base64,"]
        match_prefix = [len(prefix) for prefix in allowed_prefixes if img.startswith(prefix)]
        if not match_prefix:
            return False
        img = img[match_prefix[0]:]
        return binascii.a2b_base64(img)

    # return a list of @mentions from a text field
    def find_mentions(self, body):
        regex = re.compile(r"(@\w+)", re.MULTILINE)
        return regex.findall(body)

    # base email -> username lookup
    def lookup_username(self, email):
        return email

    # return a username, following @ convention and email lookup
    def get_username(self, email):
        if email.startswith('@'):
            return email
        parsed_email = parseaddr(email)
        if parsed_email[1]:
            if "@" in parsed_email[1]:
                return "@" + self.lookup_username(parsed_email[1])
            else:
                return "@" + email
        return False
