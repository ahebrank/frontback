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

The nginx/uwsgi/flash configuration is not trivial, but see config files in the `endpoint` directory.

## Building and testing

`gulp` builds styles and scripts and puts up a test page at `http://localhost:3000`.  See `test/index.html` to modify the plugin configuration.

You can run the flask endpoint locally with:

```bash
cd endpoint
python issue_proxy.py -c repos.json -p 9000
```
