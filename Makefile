JS=js/iflex.js js/autobahn_min.js js/iflex_spa.js
PHP=plugins/wordpress/iflex_livestats.php plugins/wordpress/readme.txt
ZIP=dist/wordpress_livestats.zip
TMP=dist/tmp

dist/wordpress_livestats.zip: ${PHP} ${JS}
	@rm -f ${ZIP}
	@mkdir -p ${TMP}
	@cp -r js ${TMP}
	@cp ${PHP} ${TMP}
	@cd ${TMP}; zip -r wordpress_livestats.zip iflex_livestats.php readme.txt js/*
	@cd ${TMP}; mv wordpress_livestats.zip ..
	@rm -rf ${TMP}

clean:
	@rm -f ${ZIP}
	@rm -rf ${TMP}
