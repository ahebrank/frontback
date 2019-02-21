dev:
	gulp &
	cd endpoint && python3 issue_proxy.py -c repos.json -p 9010 --debug 

install:
	npm install
	cd endpoint && pip3 install -r requirements.txt
