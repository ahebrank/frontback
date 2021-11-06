dev:
	node_modules/.bin/gulp &
	cd endpoint && python3 issue_proxy.py -c repos.json -p 9010 --debug

install:
	yarn
	cd endpoint && pip3 install -r requirements.txt

dist:
	rm -rf dist
	cp -R endpoint dist
	mv dist/frontback.ini dist/uwsgi.ini