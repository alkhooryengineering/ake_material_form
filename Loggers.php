<?php
// Database connection parameters
$host = "your_db_host";
$db   = "your_db_name";
$user = "your_db_user";
$pass = "your_db_password";

try {
    $conn = new PDO("mysql:host=$host;dbname=$db;charset=utf8",$user,$pass);
    $conn->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    die("DB Connection failed: " . $e->getMessage());
}

// Handle AJAX requests
if($_SERVER['REQUEST_METHOD']==='POST' && isset($_POST['action'])){
    header('Content-Type: application/json');
    $action = $_POST['action'];

    if($action==='save'){
        $serial = $_POST['serial_number'];
        $device = $_POST['device_name'];
        $location = $_POST['location'];
        $person = $_POST['person_name'];
        $photo = $_POST['photo']; // base64
        $timestamp = date("Y-m-d H:i:s");

        // Check if serial exists
        $stmt = $conn->prepare("SELECT id FROM devices WHERE serial_number=?");
        $stmt->execute([$serial]);
        if($stmt->rowCount()>0){
            // update
            $stmt = $conn->prepare("UPDATE devices SET device_name=?, location=?, person_name=?, timestamp=?, photo=? WHERE serial_number=?");
            $stmt->execute([$device,$location,$person,$timestamp,$photo,$serial]);
        } else {
            // insert
            $stmt = $conn->prepare("INSERT INTO devices (serial_number, device_name, location, person_name, timestamp, photo) VALUES (?,?,?,?,?,?)");
            $stmt->execute([$serial,$device,$location,$person,$timestamp,$photo]);
        }

        // Return updated devices
        $stmt = $conn->query("SELECT * FROM devices ORDER BY timestamp DESC");
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        exit;
    }

    if($action==='fetch'){
        $stmt = $conn->query("SELECT * FROM devices ORDER BY timestamp DESC");
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        exit;
    }
}
?>
