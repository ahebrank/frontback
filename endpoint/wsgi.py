import os
from issue_proxy import create_app

config = os.path.dirname(os.path.realpath(__file__)) + '/repos.json'
app = create_app(config)

if __name__ == "__main__":
	app.run()