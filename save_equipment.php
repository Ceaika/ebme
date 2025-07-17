<?php

require_once 'config.php';

header('Content-Type: application/json');

//map codes
function mapEquipmentCode($type) {
    return [
        "Aparat Raze X" => "01",
        "Ecograf" => "02",
        "Scanner CT" => "03",
        "Scanner RMN" => "04",
        "Monitor Pacient" => "05",
        "Defibrillator" => "06",
        "Pompa de Perfuzie" => "07",
        "Ventilator" => "08",
        "Aparat Anestezie" => "09",
        "Altele" => "99"
    ][$type] ?? "99";
}

function mapManufacturerCode($producer) {
    return [
        "General Electric" => "GE",
        "Siemens" => "SI",
        "Philips" => "PH",
        "Medtronic" => "MD",
        "Toshiba" => "TH",
        "Hitachi" => "HI",
        "Canon" => "CA",
        "Samsung" => "SA",
        "Other" => "OT"
    ][$producer] ?? "OT";
}

try {
    $pdo = getConnection();
    $action = $_POST['action'] ?? 'add';
    
    switch($action) {
        case 'add':
            // fetch next id
            $stmt = $pdo->query("SELECT get_next_equipment_id() as next_id");
            $nextId = $stmt->fetch()['next_id'];

            // file upload
            $manualFilename = '';
            if (isset($_FILES['instruction_manual']) && $_FILES['instruction_manual']['error'] == 0) {
                $uploadedFile = $_FILES['instruction_manual'];
                $fileExtension = strtolower(pathinfo($uploadedFile['name'], PATHINFO_EXTENSION));
                
                if ($fileExtension == 'pdf') {
                    $manualFilename = $nextId . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '', $uploadedFile['name']);
                    $uploadPath = UPLOAD_DIR . $manualFilename;
                    
                    if (!move_uploaded_file($uploadedFile['tmp_name'], $uploadPath)) {
                        echo json_encode(['success' => false, 'error' => 'Failed to upload manual file']);
                        exit;
                    }
                } else {
                    echo json_encode(['success' => false, 'error' => 'Please upload a PDF file']);
                    exit;
                }
            }

            // autogenerate barcode if not given
            if (!empty($_POST['barcode'])) {
                $barcode = $_POST['barcode'];
            } else {
                $year = date("y"); // e.g. "24"
                $equipCode = mapEquipmentCode($_POST['type']);
                $manufCode = mapManufacturerCode($_POST['producer']);

                //determine serial
                $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM medical_equipment WHERE type = ? AND producer = ?");
                $stmt->execute([$_POST['type'], $_POST['producer']]);
                $count = $stmt->fetch(PDO::FETCH_ASSOC)['count'] + 1;

                $barcode = "GB{$equipCode}{$manufCode}{$year}" . str_pad($count, 4, '0', STR_PAD_LEFT);
            }

            // insert
            $stmt = $pdo->prepare("
                INSERT INTO medical_equipment 
                (id, name, serial_code, producer, location, sub_location, type, due_date_service, instruction_manual, barcode) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $nextId,
                $_POST['name'],
                $_POST['serial_code'],
                $_POST['producer'],
                $_POST['location'],
                $_POST['sub_location'] ?: null,
                $_POST['type'],
                $_POST['due_date_service'] ?: null,
                $manualFilename ?: null,
                $barcode
            ]);
            
            echo json_encode([
                'success' => true, 
                'equipment_id' => $nextId,
                'message' => 'Equipment added successfully'
            ]);
            break;

        case 'update':
            $id = $_POST['id'];
            if (empty($id)) {
                echo json_encode(['success' => false, 'error' => 'Equipment ID required']);
                exit;
            }

            $stmt = $pdo->prepare("SELECT instruction_manual FROM medical_equipment WHERE id = ?");
            $stmt->execute([$id]);
            $currentEquipment = $stmt->fetch();

            if (!$currentEquipment) {
                echo json_encode(['success' => false, 'error' => 'Equipment not found']);
                exit;
            }

            $manualFilename = $currentEquipment['instruction_manual'];

            if (isset($_FILES['instruction_manual']) && $_FILES['instruction_manual']['error'] == 0) {
                $uploadedFile = $_FILES['instruction_manual'];
                $fileExtension = strtolower(pathinfo($uploadedFile['name'], PATHINFO_EXTENSION));

                if ($fileExtension == 'pdf') {
                    if ($manualFilename && file_exists(UPLOAD_DIR . $manualFilename)) {
                        unlink(UPLOAD_DIR . $manualFilename);
                    }

                    $manualFilename = $id . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '', $uploadedFile['name']);
                    $uploadPath = UPLOAD_DIR . $manualFilename;

                    if (!move_uploaded_file($uploadedFile['tmp_name'], $uploadPath)) {
                        echo json_encode(['success' => false, 'error' => 'Failed to upload manual file']);
                        exit;
                    }
                } else {
                    echo json_encode(['success' => false, 'error' => 'Please upload a PDF file']);
                    exit;
                }
            }

            $stmt = $pdo->prepare("
                UPDATE medical_equipment 
                SET name = ?, serial_code = ?, producer = ?, location = ?, sub_location = ?, 
                    type = ?, due_date_service = ?, instruction_manual = ?, barcode = ?
                WHERE id = ?
            ");
            
            $stmt->execute([
                $_POST['name'],
                $_POST['serial_code'],
                $_POST['producer'],
                $_POST['location'],
                $_POST['sub_location'] ?: null,
                $_POST['type'],
                $_POST['due_date_service'] ?: null,
                $manualFilename,
                $_POST['barcode'],
                $id
            ]);
            
            echo json_encode([
                'success' => true,
                'message' => 'Equipment updated successfully'
            ]);
            break;

        case 'delete':
            $id = $_POST['id'];
            if (empty($id)) {
                echo json_encode(['success' => false, 'error' => 'Equipment ID required']);
                exit;
            }

            $stmt = $pdo->prepare("SELECT instruction_manual FROM medical_equipment WHERE id = ?");
            $stmt->execute([$id]);
            $equipment = $stmt->fetch();

            if (!$equipment) {
                echo json_encode(['success' => false, 'error' => 'Equipment not found']);
                exit;
            }

            $stmt = $pdo->prepare("DELETE FROM medical_equipment WHERE id = ?");
            $stmt->execute([$id]);

            if ($equipment['instruction_manual'] && file_exists(UPLOAD_DIR . $equipment['instruction_manual'])) {
                unlink(UPLOAD_DIR . $equipment['instruction_manual']);
            }

            echo json_encode([
                'success' => true,
                'message' => 'Equipment deleted successfully'
            ]);
            break;

        default:
            echo json_encode(['success' => false, 'error' => 'Invalid action']);
            break;
    }

} catch (PDOException $e) {
    if ($e->getCode() == 23000) {
        if (strpos($e->getMessage(), 'serial_code') !== false) {
            echo json_encode(['success' => false, 'error' => 'Serial code already exists']);
        } elseif (strpos($e->getMessage(), 'barcode') !== false) {
            echo json_encode(['success' => false, 'error' => 'Barcode already exists']);
        } else {
            echo json_encode(['success' => false, 'error' => 'Duplicate entry error']);
        }
    } else {
        echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => 'Error: ' . $e->getMessage()]);
}
?>
