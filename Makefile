install:
	npm install
	cd endpoint && pip3 install -r requirements.txt

test:
	gulp &
	python3 issue_proxy.py -c repos.json -p 9010 --debug 

# CI targets
.ci_init:
	test -d /root/.ssh || mkdir /root/.ssh
	chmod 700 /root/.ssh
	cp .ci_ssh_config /root/.ssh/config
	chmod 600 /root/.ssh/config

.ci_push_production:
	rsync -rlDvz endpoint/ --delete root@$(DEPLOY_HOST):/usr/local/frontback
	ssh root@$(DEPLOY_HOST) "chown -R www-data /usr/local/frontback && service frontback restart"
