#!/usr/bin/env python3
from issue_proxy import create_app

#config = os.path.dirname(os.path.realpath(__file__)) + '/repos.json'
config = '/etc/default/frontback'
application = create_app(config, debug=True)

if __name__ == "__main__":
    application.run()
