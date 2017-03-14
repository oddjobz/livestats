dist/wordpress_livestats.zip: plugins/wordpress/iflex_livestats.php js/iflex.js js/autobahn_min.js
	@rm -f dist/wordpress_livestats.zip
	@mkdir -p dist/tmp
	@cp -r js dist/tmp
	@cp plugins/wordpress/iflex_livestats.php dist/tmp    
	@cd dist/tmp; zip -r wordpress_livestats.zip iflex_livestats.php js/*
	@cd dist/tmp; mv wordpress_livestats.zip ..
	@rm -rf dist/tmp

clean:
	@rm -f dist/wordpress_livestats.zip
	@rm -rf dist/tmp
