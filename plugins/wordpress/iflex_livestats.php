<?php
/**
 * Plugin Name: iFlexRTS LiveStats
 * Plugin URI: https://github.com/oddjobz/livestats
 * Description: Real Time Analytics for your Wordpress site
 * Version: 0.9.0
 * Author: Gareth Bult
 * Author URI: https://gareth.bult.co.uk
 * License: MIT
 */

function inject_livestats() {
    wp_enqueue_script(
        'load_autobahn',
        plugins_url('js/autobahn_min.js', __FILE__),
        array('jquery')
    );  
    wp_enqueue_script(
        'load_iflex',
        plugins_url('js/iflex.js', __FILE__),
        array('jquery')
    );  
}
add_action('wp_enqueue_scripts', inject_livestats);


function inject_livestats_auth() {
    if ( is_user_logged_in() ) {
        $user = wp_get_current_user();
        $admin = is_super_admin()?'true':'false';
        $avatar_html = get_avatar($user->user_email);
        preg_match( '@src="([^"]+)"@' , $avatar_html , $avatar );
        if(!$avatar) $avatar=['src=""'];
        echo '<script type="text/javascript">'.
             'var iflexrts_login="'.$user->user_login.'";'.
             'var iflexrts_name="'.$user->display_name.'";'.
             'var iflexrts_'.$avatar[0].';'.
             'var iflexrts_picture = iflexrts_src;'.
             'var iflexrts_admin='.$admin.';'.
             '</script>';
    }
}
add_action('wp_enqueue_scripts', inject_livestats_auth);
