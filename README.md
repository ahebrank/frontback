# Frontback

Front-end issue submission for Gitlab.  A script allows end users to take screenshots of a problem, add a comment and automatic browser info, and submit it all as a Gitlab issue.

This leans heavily on:
- [ivoviz/feedback](https://github.com/ivoviz/feedback)
- [niklasvh/html2canvas](https://github.com/niklasvh/html2canvas)

## Quickstart

### Add the plugin to a page:

```html
<script>
	window.frontback = {
		repo: 'https://gitlab.com/newcity/test',
		postUrl: 'http://' + host + ':9000'
	};
	var script = document.createElement('script');
	script.src = frontback.postUrl + '/assets/js/frontback.js';
	document.body.appendChild(script);
</script>
```

Where the first two variables define the homepage of the repository and the endpoint of the proxy.

### Configure the repo at the endpoint

In a place accessible to the endpoint proxy, add configuration:

```json
{
    "https://gitlab.com/newcity/test": {
        "private_token": "GITLAB-PRIVATE-TOKEN",
        "assignee_id": "@ahebrank"
    }
}
```

### Start it up

The nginx/uwsgi/flask configuration has a lot of pieces. The following skips over
setting up a virtual environment and assume the flask app (installed in
	`/usr/local/frontback/endpoint`) is proxied by Nginx via wsgi.

#### Set up the wsgi application

1. Make sure `uwsgi` is installed (e.g., `apt-get install uwsgi`)
2. Copy the upstart file to `/etc/init` (`cp /usr/local/frontback/endpoint/frontback.conf.upstart /etc/init/frontback.confg`)
3. Start it up (e.g., `service frontback start`)
4. (optionally) Make it persistent (e.g., `initctl reload-configuration`)

#### Set up the web proxy (with nginx)

1. Make sure the uwsgi parameters are availble to nginx
2. Add to a `server` block in nginx configuration:

```
location /frontback {
   uwsgi_pass unix:/usr/local/frontback/endpoint/frontback.sock;
   include /etc/nginx/uwsgi_params;
   uwsgi_param UWSGI_SCRIPT /frontback;
}
```

See e.g., https://www.digitalocean.com/community/tutorials/how-to-deploy-python-wsgi-applications-using-uwsgi-web-server-with-nginx for more detail about setting up and proxying uwsgi applications.


## Building and testing

`gulp` builds styles and scripts and puts up a test page at `http://localhost:3000`.  See `test/index.html` to modify the plugin configuration.

You can run the flask endpoint locally with:

```bash
cd endpoint
python issue_proxy.py -c repos.json -p 9000
```
