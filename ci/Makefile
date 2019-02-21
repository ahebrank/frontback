# CI targets
init:
	test -d /root/.ssh || mkdir /root/.ssh
	chmod 700 /root/.ssh
	cp ci/ci_ssh_config /root/.ssh/config
	chmod 600 /root/.ssh/config

push_production:
	rsync -rlDvz endpoint/ --delete root@$(DEPLOY_HOST):/usr/local/frontback
	ssh root@$(DEPLOY_HOST) "chown -R www-data /usr/local/frontback && service frontback restart"
