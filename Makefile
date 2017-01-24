# CI targets
.ci_init:
	test -d /root/.ssh || mkdir /root/.ssh
	chmod 700 /root/.ssh
	cp .ci_ssh_config /root/.ssh/config
	chmod 600 /root/.ssh/config

.ci_push_production:
	rsync -rlDvz endpoint/ --delete root@$(DEPLOY_HOST):/usr/local/frontback
	ssh root@$(DEPLOY_HOST) test -f /usr/local/frontback/repos.json && chown -R www-data /usr/local/frontback
