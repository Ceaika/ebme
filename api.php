<?php
require_once 'config.php';

header('Content-Type: application/json');

try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME, DB_USERNAME, DB_PASSWORD);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $action = $_GET['action'] ?? '';
    
    switch ($action) {
        case 'stats':
            // fetch statistica aparate 
            $stmt = $pdo->query("SELECT COUNT(*) as total FROM medical_equipment");
            $total = $stmt->fetch(PDO::FETCH_ASSOC)['total'];
            
            $stmt = $pdo->query("SELECT COUNT(*) as due_soon FROM medical_equipment WHERE due_date_service BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)");
            $due_soon = $stmt->fetch(PDO::FETCH_ASSOC)['due_soon'];
            
            $stmt = $pdo->query("SELECT COUNT(*) as overdue FROM medical_equipment WHERE due_date_service < CURDATE()");
            $overdue = $stmt->fetch(PDO::FETCH_ASSOC)['overdue'];
            
            $stmt = $pdo->query("SELECT COUNT(DISTINCT type) as types FROM medical_equipment");
            $types = $stmt->fetch(PDO::FETCH_ASSOC)['types'];
            
            echo json_encode([
                'total' => (int)$total,
                'due_soon' => (int)$due_soon,
                'overdue' => (int)$overdue,
                'types' => (int)$types
            ]);
            break;

        case 'overdue':
    // Fetch only overdue equipment
    $stmt = $pdo->query("
        SELECT * FROM medical_equipment 
        WHERE due_date_service < CURDATE() 
        AND due_date_service IS NOT NULL 
        ORDER BY due_date_service ASC
    ");
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($results);
    break;

case 'types_list':
    // Get list of types with counts
    $stmt = $pdo->query("
        SELECT type, COUNT(*) as count 
        FROM medical_equipment 
        GROUP BY type 
        ORDER BY count DESC
    ");
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($results);
    break;

case 'by_type':
    // Get equipment by type
    $type = $_GET['type'] ?? '';
    if (empty($type)) {
        echo json_encode([]);
        break;
    }
    
    $stmt = $pdo->prepare("
        SELECT * FROM medical_equipment 
        WHERE type = ? 
        ORDER BY name ASC
    ");
    $stmt->execute([$type]);
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($results);
    break;
            
        case 'all':
            // fetch all aparate
            $stmt = $pdo->query("SELECT * FROM medical_equipment ORDER BY id ASC");
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode($results);
            break;
            
        case 'view':
            // view single aparat
            $id = $_GET['id'] ?? '';
            if (empty($id)) {
                echo json_encode(['error' => 'No ID provided']);
                break;
            }
            
            $stmt = $pdo->prepare("SELECT * FROM medical_equipment WHERE id = ?");
            $stmt->execute([$id]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($result) {
                echo json_encode($result);
            } else {
                echo json_encode(['error' => 'Equipment not found']);
            }
            break;
            
        case 'service_alerts':
            // fetch aparat needing service
            $stmt = $pdo->query("
                SELECT * FROM medical_equipment 
                WHERE due_date_service <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) 
                AND due_date_service IS NOT NULL 
                ORDER BY due_date_service ASC
            ");
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode($results);
            break;
            
        case 'quick_search':
            // cautare rapida peste mai multe domenii (name, location, type, ID, producer)
            $term = $_GET['term'] ?? '';
            if (empty($term)) {
                echo json_encode([]);
                break;
            }
            
            // normalizare
            $normalizedTerm = strtolower(str_replace(['-', '_', ' ', '.'], '', $term));
            
            $stmt = $pdo->prepare("
                SELECT *, 
                    CASE 
                        WHEN id = ? THEN 1
                        WHEN LOWER(REPLACE(REPLACE(REPLACE(REPLACE(name, '-', ''), '_', ''), ' ', ''), '.', '')) LIKE ? THEN 2
                        WHEN LOWER(REPLACE(REPLACE(REPLACE(REPLACE(producer, '-', ''), '_', ''), ' ', ''), '.', '')) LIKE ? THEN 3
                        WHEN LOWER(REPLACE(REPLACE(REPLACE(REPLACE(type, '-', ''), '_', ''), ' ', ''), '.', '')) LIKE ? THEN 4
                        WHEN LOWER(REPLACE(REPLACE(REPLACE(REPLACE(location, '-', ''), '_', ''), ' ', ''), '.', '')) LIKE ? THEN 5
                        WHEN LOWER(REPLACE(REPLACE(REPLACE(REPLACE(sub_location, '-', ''), '_', ''), ' ', ''), '.', '')) LIKE ? THEN 6
                        WHEN id LIKE ? THEN 7
                        WHEN name LIKE ? THEN 8
                        WHEN producer LIKE ? THEN 9
                        WHEN type LIKE ? THEN 10
                        WHEN location LIKE ? THEN 11
                        WHEN sub_location LIKE ? THEN 12
                        ELSE 13
                    END as relevance_score
                FROM medical_equipment 
                WHERE id LIKE ? 
                OR name LIKE ? 
                OR location LIKE ? 
                OR sub_location LIKE ?
                OR type LIKE ? 
                OR producer LIKE ?
                OR LOWER(REPLACE(REPLACE(REPLACE(REPLACE(name, '-', ''), '_', ''), ' ', ''), '.', '')) LIKE ?
                OR LOWER(REPLACE(REPLACE(REPLACE(REPLACE(producer, '-', ''), '_', ''), ' ', ''), '.', '')) LIKE ?
                OR LOWER(REPLACE(REPLACE(REPLACE(REPLACE(type, '-', ''), '_', ''), ' ', ''), '.', '')) LIKE ?
                OR LOWER(REPLACE(REPLACE(REPLACE(REPLACE(location, '-', ''), '_', ''), ' ', ''), '.', '')) LIKE ?
                OR LOWER(REPLACE(REPLACE(REPLACE(REPLACE(sub_location, '-', ''), '_', ''), ' ', ''), '.', '')) LIKE ?
                ORDER BY relevance_score ASC, id ASC
                LIMIT 20
            ");
            
            $searchTerm = "%$term%";
            $normalizedSearchTerm = "%$normalizedTerm%";
            $exactTerm = $term;
            
            $stmt->execute([
                // relevanta
                $exactTerm, $normalizedSearchTerm, $normalizedSearchTerm, $normalizedSearchTerm, $normalizedSearchTerm, $normalizedSearchTerm,
                $searchTerm, $searchTerm, $searchTerm, $searchTerm, $searchTerm, $searchTerm,
                // For WHERE clause
                $searchTerm, $searchTerm, $searchTerm, $searchTerm, $searchTerm, $searchTerm,
                $normalizedSearchTerm, $normalizedSearchTerm, $normalizedSearchTerm, $normalizedSearchTerm, $normalizedSearchTerm
            ]);
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode($results);
            break;
            
case 'barcode_lookup':
    $barcode = $_GET['barcode'] ?? '';
    if (empty($barcode)) {
        echo json_encode(['success' => false, 'error' => 'No barcode provided']);
        break;
    }

    // verifica daca exista
    $stmt = $pdo->prepare("SELECT * FROM medical_equipment WHERE barcode = ?");
    $stmt->execute([$barcode]);
    $equipment = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($equipment) {
        echo json_encode([
            'success' => true,
            'found' => true,
            'equipment' => $equipment
        ]);
    } else {
    
        $productData = tryExternalLookup($barcode);

        if ($productData) {
            echo json_encode([
                'success' => true,
                'found' => false,
                'autofill' => true,
                'product' => $productData
            ]);
        } else {
            echo json_encode([
                'success' => true,
                'found' => false,
                'barcode' => $barcode,
                'message' => 'New barcode - ready to add equipment'
            ]);
        }
    }
    break;
  
            // verifica datele exacta daca se intersecteaza
            $stmt = $pdo->prepare("SELECT * FROM medical_equipment WHERE barcode = ?");
            $stmt->execute([$barcode]);
            $equipment = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($equipment) {
                echo json_encode([
                    'success' => true,
                    'found' => true,
                    'equipment' => $equipment
                ]);
            } else {
                echo json_encode([
                    'success' => true,
                    'found' => false,
                    'barcode' => $barcode,
                    'message' => 'New barcode - ready to add equipment'
                ]);
            }
            break;
            
        case 'add_equipment':
            //  new equipment or update existing
            $barcode = $_POST['barcode'] ?? '';
            $name = $_POST['name'] ?? '';
            $serial_code = $_POST['serial_code'] ?? '';
            $producer = $_POST['producer'] ?? '';
            $location = $_POST['location'] ?? '';
            $sub_location = $_POST['sub_location'] ?? '';
            $type = $_POST['type'] ?? '';
            $due_date_service = $_POST['due_date_service'] ?? null;
            $instruction_manual = $_POST['instruction_manual'] ?? '';
            
            if (empty($barcode)) {
                echo json_encode(['success' => false, 'error' => 'Barcode is required']);
                break;
            }
            
            // chk if barcode already exists
            $stmt = $pdo->prepare("SELECT id FROM medical_equipment WHERE barcode = ?");
            $stmt->execute([$barcode]);
            $exists = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($exists) {
                // upd existing equipment
                $stmt = $pdo->prepare("
                    UPDATE medical_equipment 
                    SET name = ?, serial_code = ?, producer = ?, location = ?, 
                        sub_location = ?, type = ?, due_date_service = ?, 
                        instruction_manual = ?
                    WHERE barcode = ?
                ");
                $stmt->execute([
                    $name, $serial_code, $producer, $location, 
                    $sub_location, $type, $due_date_service, 
                    $instruction_manual, $barcode
                ]);
                
                echo json_encode([
                    'success' => true,
                    'action' => 'updated',
                    'id' => $exists['id'],
                    'message' => 'Equipment updated successfully'
                ]);
            } else {
                // ins new equipment
                $stmt = $pdo->prepare("
                    INSERT INTO medical_equipment 
                    (barcode, name, serial_code, producer, location, 
                     sub_location, type, due_date_service, instruction_manual)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");
                $stmt->execute([
                    $barcode, $name, $serial_code, $producer, $location, 
                    $sub_location, $type, $due_date_service, $instruction_manual
                ]);
                
                echo json_encode([
                    'success' => true,
                    'action' => 'created',
                    'id' => $pdo->lastInsertId(),
                    'message' => 'Equipment added successfully'
                ]);
            }
            break;
            
        case 'advanced_search':
            // adv cautare by barcode or serial
            $term = $_GET['term'] ?? '';
            if (empty($term)) {
                echo json_encode([]);
                break;
            }
            
            $stmt = $pdo->prepare("
                SELECT * FROM medical_equipment 
                WHERE barcode = ? OR barcode LIKE ?
                OR serial_code = ? OR serial_code LIKE ?
                ORDER BY 
                    CASE 
                        WHEN barcode = ? THEN 1
                        WHEN serial_code = ? THEN 2
                        WHEN barcode LIKE ? THEN 3
                        ELSE 4
                    END
                LIMIT 10
            ");
            
            $exactTerm = $term;
            $searchTerm = "%$term%";
            
            $stmt->execute([
                $exactTerm, $searchTerm, $exactTerm, $searchTerm,
                $exactTerm, $exactTerm, $searchTerm
            ]);
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode($results);
            break;
            
        case 'advanced_filter':
            // adv filter search with multiple criteria
            $conditions = [];
            $params = [];
            
            if (!empty($_GET['id'])) {
                $conditions[] = "id LIKE ?";
                $params[] = '%' . $_GET['id'] . '%';
            }
            if (!empty($_GET['name'])) {
                $normalizedName = strtolower(str_replace(['-', '_', ' ', '.'], '', $_GET['name']));
                $conditions[] = "(name LIKE ? OR LOWER(REPLACE(REPLACE(REPLACE(REPLACE(name, '-', ''), '_', ''), ' ', ''), '.', '')) LIKE ?)";
                $params[] = '%' . $_GET['name'] . '%';
                $params[] = '%' . $normalizedName . '%';
            }
            if (!empty($_GET['producer'])) {
                $normalizedProducer = strtolower(str_replace(['-', '_', ' ', '.'], '', $_GET['producer']));
                $conditions[] = "(producer LIKE ? OR LOWER(REPLACE(REPLACE(REPLACE(REPLACE(producer, '-', ''), '_', ''), ' ', ''), '.', '')) LIKE ?)";
                $params[] = '%' . $_GET['producer'] . '%';
                $params[] = '%' . $normalizedProducer . '%';
            }
            if (!empty($_GET['type'])) {
                $normalizedType = strtolower(str_replace(['-', '_', ' ', '.'], '', $_GET['type']));
                $conditions[] = "(type = ? OR type LIKE ? OR LOWER(REPLACE(REPLACE(REPLACE(REPLACE(type, '-', ''), '_', ''), ' ', ''), '.', '')) LIKE ?)";
                $params[] = $_GET['type'];
                $params[] = '%' . $_GET['type'] . '%';
                $params[] = '%' . $normalizedType . '%';
            }
            if (!empty($_GET['location'])) {
                $normalizedLocation = strtolower(str_replace(['-', '_', ' ', '.'], '', $_GET['location']));
                $conditions[] = "(location LIKE ? OR sub_location LIKE ? OR LOWER(REPLACE(REPLACE(REPLACE(REPLACE(location, '-', ''), '_', ''), ' ', ''), '.', '')) LIKE ? OR LOWER(REPLACE(REPLACE(REPLACE(REPLACE(sub_location, '-', ''), '_', ''), ' ', ''), '.', '')) LIKE ?)";
                $params[] = '%' . $_GET['location'] . '%';
                $params[] = '%' . $_GET['location'] . '%';
                $params[] = '%' . $normalizedLocation . '%';
                $params[] = '%' . $normalizedLocation . '%';
            }
            if (!empty($_GET['serial'])) {
                $normalizedSerial = strtolower(str_replace(['-', '_', ' ', '.'], '', $_GET['serial']));
                $conditions[] = "(serial_code LIKE ? OR LOWER(REPLACE(REPLACE(REPLACE(REPLACE(serial_code, '-', ''), '_', ''), ' ', ''), '.', '')) LIKE ?)";
                $params[] = '%' . $_GET['serial'] . '%';
                $params[] = '%' . $normalizedSerial . '%';
            }
            if (!empty($_GET['barcode'])) {
                $normalizedBarcode = strtolower(str_replace(['-', '_', ' ', '.'], '', $_GET['barcode']));
                $conditions[] = "(barcode LIKE ? OR LOWER(REPLACE(REPLACE(REPLACE(REPLACE(barcode, '-', ''), '_', ''), ' ', ''), '.', '')) LIKE ?)";
                $params[] = '%' . $_GET['barcode'] . '%';
                $params[] = '%' . $normalizedBarcode . '%';
            }
            if (!empty($_GET['service_status'])) {
                switch($_GET['service_status']) {
                    case 'overdue':
                        $conditions[] = "due_date_service < CURDATE()";
                        break;
                    case 'due_soon':
                        $conditions[] = "due_date_service BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)";
                        break;
                    case 'ok':
                        $conditions[] = "(due_date_service > DATE_ADD(CURDATE(), INTERVAL 30 DAY) OR due_date_service IS NULL)";
                        break;
                }
            }
            
            $sql = "SELECT * FROM medical_equipment";
            if (!empty($conditions)) {
                $sql .= " WHERE " . implode(' AND ', $conditions);
            }
            $sql .= " ORDER BY id ASC";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode($results);
            break;
            
        case 'check_barcode':
            // Simple check if barcode exists (returns true/false)
            $barcode = $_GET['barcode'] ?? '';
            if (empty($barcode)) {
                echo json_encode(['exists' => false]);
                break;
            }
            
            $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM medical_equipment WHERE barcode = ?");
            $stmt->execute([$barcode]);
            $count = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
            
            echo json_encode(['exists' => $count > 0]);
            break;
            
        default:
            echo json_encode(['error' => 'Invalid action']);
    }
    
} catch (PDOException $e) {
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);

    function tryExternalLookup($barcode) {
    // placeholder
    if ($barcode === '1234567890') {
        return [
            'name' => 'Monitor Cardiac GE',
            'manufacturer' => 'GE Healthcare',
            'serial' => 'SN-GE-MON-001',
            'category' => 'Monitor'
        ];
    }

    return null; // not found
}

}





?>