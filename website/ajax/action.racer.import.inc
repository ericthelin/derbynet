<?php

require_once('inc/newracer.inc');
require_once('inc/sql-script.inc');
require_once(sql_file_path('column-widths'));
require_once('inc/schema_version.inc');


function as_boolean($val) {
  if (is_string($val)) {
    $val = trim($val);
  }
  if ($val === true || $val === 1 || $val === '1') return true;
  if ($val === false || $val === 0 || $val === '0' || $val === '') return false;
  $val = strtolower($val)[0];
  return $val != 'n';
}

start_response();

if (have_permission(SET_UP_PERMISSION)) {

  // $fields tells what parameters we expect, and whether each is required.
  // Note that we don't actually test for unexpected parameters; we just ignore
  // them.
  $fields = array('lastname' => true,  
                  'firstname' => true,
                  'classname' => true,
                  'carnumber' => false,
                  'carname' => false,
                  'subgroup' => false,
                  'exclude' => false);

  // An alternative to separate lastname and firstname parameters is a single
  // combined field, called first-last.  The content can either be firstname
  // then lastname separated by a space, or lastname then firstname separated by
  // comma and optional space.
  if (isset($_POST['first-last'])) {
    $comma = strpos($_POST['first-last'], ',');
    if ($comma === false) {
      // firstname then lastname, space-separated.  Use the last space after
      // trimming as the dividing point.
      $first_last = trim($_POST['first-last']);
      $space = strrpos($first_last, ' ');
      if ($space === false) {
        $_POST['firstname'] = '';
        $_POST['lastname'] = $first_last;
      } else {
        // These will get trimmed later
        $_POST['firstname'] = substr($first_last, 0, $space);
        $_POST['lastname'] = substr($first_last, $space + 1);
      }
    } else {
      // Comma signals lastname then firstname
      // These will get trimmed later
      $_POST['firstname'] = substr($_POST['first-last'], $comma + 1);
      $_POST['lastname'] = substr($_POST['first-last'], 0, $comma);
    }
  }

  $ok = true;

  foreach ($fields as $fieldname => $required) {
    if ($required && !isset($_POST[$fieldname])) {
      echo '<failure code="missingrequired">Missing required field '.$fieldname.'</failure>';
      $ok = false;
      break;
    }
  }
} else {
  not_authorized_body();
  $ok = false;
}
    
if ($ok) {

  $classname = substr(trim($_POST['classname']), 0, CLASS_COLUMN_WIDTH);
  // We're failing to find the existing record, but trying to write a
  // new one gives a uniqueness violation against the truncated name.
  $classid = read_single_value('SELECT classid FROM Classes WHERE class = :classname',
                               array(':classname' => $classname));
  if ($classid === false) {
    $stmt = $db->prepare('INSERT INTO Classes(class) VALUES(:classname)');
    $stmt->execute(array(':classname' => $classname));
    $classid = read_single_value('SELECT classid FROM Classes WHERE class = :classname',
                                 array(':classname' => $classname));
    if (schema_version() >= 2) {
      $nclasses = read_single_value('SELECT COUNT(*) FROM Classes');
      $stmt = $db->prepare('UPDATE Classes'
                           .' SET sortorder = :nclasses'
                           .' WHERE classid = :classid');
      $stmt->execute(array(':classid' => $classid,
                           ':nclasses' => $nclasses));
    }

    // Creating a class usually requires creating a corresponding 1st racing round
    $stmt = $db->prepare('INSERT INTO Rounds(round, classid)'
                         .' SELECT 1, classid'
                         .' FROM Classes'
                         .' WHERE classid = :classid'
                         .' AND NOT EXISTS(SELECT 1 FROM Rounds'
                         .'  WHERE Rounds.classid = Classes.classid'
                         .'    AND Rounds.round = 1)');
    $stmt->execute(array(':classid' => $classid));
  }

  $rankname = isset($_POST['subgroup']) ? trim($_POST['subgroup']) : $classname;
  $rankid = read_single_value('SELECT rankid FROM Ranks WHERE rank = :rankname AND classid = :classid',
                              array(':rankname' => $rankname,
                                    ':classid' => $classid));
  if ($rankid === false) {
    $stmt = $db->prepare('INSERT INTO Ranks(rank, classid) VALUES(:rankname, :classid)');
    $stmt->execute(array(':rankname' => $rankname,
                         ':classid' => $classid));
    $rankid = read_single_value('SELECT rankid FROM Ranks WHERE rank = :rankname AND classid = :classid',
                                array(':rankname' => $rankname,
                                      ':classid' => $classid));
    if (schema_version() >= 2) {
      $nranks = read_single_value('SELECT COUNT(*) FROM Ranks WHERE classid = :classid',
                                  array(':classid' => $classid));
      $stmt = $db->prepare('UPDATE Ranks'
                           .' SET sortorder = :nranks'
                           .' WHERE rankid = :rankid');
      $stmt->execute(array(':nranks' => $nranks,
                           ':rankid' => $rankid));
    }
  }

  $carnumber = isset($_POST['carnumber']) ? $_POST['carnumber'] : 0;
  $carname = isset($_POST['carname']) ? $_POST['carname'] : '';

  $exclude = isset($_POST['exclude']) ? as_boolean($_POST['exclude']) : false;
   
  insert_new_racer_rankid_and_classid($_POST['firstname'], $_POST['lastname'], $carnumber, $carname,
                                      $rankid, $classid, $exclude);

  echo '<success/>';
}

end_response();
?>