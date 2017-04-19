<?php
	$fn = $_POST["filename"];
    move_uploaded_file($_FILES["blob"]['tmp_name'], './posted/'.$fn);
    var_dump($_POST);