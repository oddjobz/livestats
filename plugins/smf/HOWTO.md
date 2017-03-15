###For now this is a manual installation.

In your forum folder, add a sum-folder called "iflex" and add to it the three ".js" files
from this project and from the SPA project.

Now move to the "Themes/<your theme>" folder and locate the line;
```html
<link rel="stylesheet" type="text/css" href="', $settings['theme_url'], '/css/rtl.css" />';
```
And insert the following after it;
```php
//      Include iFlex Code here
$user = $context['user'];
echo '<script type="text/javascript" src="//code.jquery.com/jquery-3.1.1.min.js"></script>';
echo '<script type="text/javascript" src="iflex/autobahn_min.js"></script>';
echo '<script type="text/javascript" src="iflex/iflex_spa.js" defer></script>';
echo '<script type="text/javascript" src="iflex/iflex.js"></script>';
$avatar_html = $user['avatar']['image'];
preg_match( '@src="([^"]+)"@' , $avatar_html , $avatar );
if($user['is_logged']) {
        echo '<script type="text/javascript">'.
                'var iflexrts_login="'.$user['username'].'";'.
                'var iflexrts_name="'.$user['name'].'";'.
                'var iflexrts_admin="'.$user['is_admin'].'";'.
                'var iflexrts_'.( strlen($avatar[0]) > 0 ? $avatar[0] : 'src=""').';'.
                'var iflexrts_picture = iflexrts_src;'.
                '</script>';
};
//
```
####Note; if you're already using jQuery on your forum for some third party product, you may need
to remove the line above that includes jQuery 3.1.