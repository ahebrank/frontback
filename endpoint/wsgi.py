import os
from issue_proxy import create_app

#config = os.path.dirname(os.path.realpath(__file__)) + '/repos.json'
config = '/etc/default/frontback'
application = create_app(config, asynchronous=True, debug=False)

if __name__ == "__main__":
	application.run()
