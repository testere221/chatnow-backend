<?php

$url = 'http://default.turhost.com';

$data = array (
    'domain' => $_SERVER['SERVER_NAME']
);

$params = '';

foreach($data as $key=>$value) {
    $params .= $key . '=' . $value . '&';
}

$params = trim($params, '&');

$ch = curl_init();

curl_setopt($ch, CURLOPT_URL, $url.'?'.$params ); //Url together with parameters
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1); //Return data instead printing directly in Browser
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT , 7); //Timeout after 7 seconds
curl_setopt($ch, CURLOPT_USERAGENT , "Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.1)");
curl_setopt($ch, CURLOPT_HEADER, 0);

$result = curl_exec($ch);
curl_close($ch);

if($result) {
    echo $result;
}
else {

?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<title>Web Sitemiz Hazırlanıyor</title>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />

<style type="text/css">
html,body,iframe { margin:0; padding: 0; }
#frame { border: 0; width: 100%; height: 100%; }
</style>

<script type="text/javascript" src="http://default.turhost.com/js/jquery-1.7.2.min.js"></script>
<script type="text/javascript">
$(document).ready(function(){
    var domain = window.location.host;
    $("#frame").attr("src","http://default.turhost.com/?domain=" + domain);
    resizeFrame();
});

$(window).resize(function() {
    resizeFrame();
});

/* Frame resizer */
function resizeFrame() {
    $("#frame").css({"width": + $(document).width() + "px","height": + $(document).height() + "px"});
}
</script>
</head>
<body>

<iframe src="http://default.turhost.com" id="frame"></iframe>

</body>
</html>

<?php } ?>
