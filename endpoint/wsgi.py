import os
from issue_proxy import create_app

if __name__ == "__main__":
	config = os.path.dirname(os.path.realpath(__file__)) + '/repos.json'
	app = create_app(config)
	app.run()
