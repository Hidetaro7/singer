<?php
	$fn = $_POST["filename"];
    $moved = move_uploaded_file($_FILES["blob"]['tmp_name'], './posted/'.$fn);
    //var_dump($_POST);

  if( $moved ) {
	  echo "Successfully_uploaded";         
	} else {
	  echo "Not_uploaded";
	}