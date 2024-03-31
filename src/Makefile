build:
	git checkout chrome
	git checkout main
	web-ext build
	git checkout chrome
	git merge main
	web-ext build -a web-ext-artifacts/chrome-artifacts
	git checkout main

run:
	web-ext run
