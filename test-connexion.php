<?php
  $host_name = 'your host name';
  $database = 'your database';
  $user_name = 'your user name';
  $password = 'your password';

  $link = new mysqli($host_name, $user_name, $password, $database);

  if ($link->connect_error) {
    die('<p>La connexion au serveur MySQL a échoué: '. $link->connect_error .'</p>');
  } else {
    echo '<p>Connexion au serveur MySQL établie avec succès.</p>';
  }
?>