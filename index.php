<?php require_once 'config.php'; ?>
<!DOCTYPE html>
<html lang="ro">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GBG EBME</title>
    
    <!-- favicon -->
    <link rel="icon" type="image/png" sizes="32x32" href="images/favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="images/favicon-16x16.png">
    <link rel="apple-touch-icon" sizes="180x180" href="images/apple-touch-icon.png">
    <link rel="manifest" href="site.webmanifest">
    
    <link rel="stylesheet" href="styles.css">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-content">
                <div class="header-left">
                    <div class="logo" onclick="goHome()">
                       <!--logo-->
                        <?php if (file_exists('images/gbg-logo.png')): ?>
                            <img src="images/gbg-logo.png" alt="Logo GBG">
                        <?php elseif (file_exists('images/logo.jpg')): ?>
                            <img src="images/gbg-logo.jpg" alt="Logo GBG">
                        <?php elseif (file_exists('images/logo.svg')): ?>
                            <img src="images/gbg-logo.svg" alt="Logo GBG">
                        <?php else: ?>
                            <i class="fas fa-hospital-symbol"></i>
                        <?php endif; ?>
                    </div>
                    <div class="header-text">
                        <h1>GBG EBME</h1>
                        <p class="subtitle">GBG Electronic Bio-Medical Engineering</p>
                    </div>
                </div>
                
                <div class="header-right">
                    <div class="search-header">
                        <i class="fas fa-search"></i>
                        <input type="text" id="headerBarcodeInput" placeholder="Cautare rapida (nume, tip, locatie, ID, producator)..." onkeyup="headerBarcodeSearch(event)">
                    </div>
                    <div class="alert-indicator no-alerts" id="alertIndicator" onclick="showServiceAlerts()">
                        <i class="fas fa-bell"></i>
                        <div class="alert-count" id="alertCount" style="display: none;">0</div>
                    </div>
                </div>
                
                <div class="nav nav-flex">
                <button class="btn btn-success" onclick="showAddForm()">
                    <i class="fas fa-plus"></i> Adauga Echipament
                </button>
                <button class="btn btn-primary" onclick="showSearch()">
                    <i class="fas fa-search"></i> Cautare Avansata
                </button>
                <button class="btn btn-primary" onclick="window.open('http://localhost/med_equipment/generator.html', '_blank')">
                    <i class="fas fa-cogs"></i> Generator Barcode
                </button>

                </div>
            </div>
        </div>

        <!-- stats -->
<div class="stats-grid">
    <div class="stat-card stat-total clickable" onclick="showAllEquipment()">
        <div class="stat-number" id="total-count">0</div>
        <div class="stat-label">Total Echipamente</div>
    </div>
    <div class="stat-card stat-warning clickable" onclick="showDueSoonEquipment()">
        <div class="stat-number" id="due-soon-count">0</div>
        <div class="stat-label">Service In Curand</div>
    </div>
    <div class="stat-card stat-danger clickable" onclick="showOverdueEquipment()">
        <div class="stat-number" id="overdue-count">0</div>
        <div class="stat-label">Service Intarziat</div>
    </div>
    <div class="stat-card stat-success clickable" onclick="showEquipmentTypes()">
        <div class="stat-number" id="types-count">0</div>
        <div class="stat-label">Tipuri Echipamente</div>
    </div>
    
</div>

        <!-- search barcode -->
        <div class="card">
            <h3><i class="fas fa-barcode"></i> Cautare Avansata - Cod de Bare sau Serial</h3>
            <div class="search-container">
                <input type="text" id="barcodeInput" class="search-box" placeholder="Introduce codul de bare sau numarul de serie..." onkeyup="searchBarcode(event)">
                <i class="fas fa-search search-icon"></i>
            </div>
            <div id="barcode-results"></div>
        </div>

        <!-- main-->
        <div class="card">
            <div id="main-content">
                <h3><i class="fas fa-tachometer-alt"></i> Panou de Control</h3>
                <p class="text-muted" style="font-size: 1.125rem; margin-bottom: 24px;">Bun venit in GBG EBME. Foloseste butoanele de navigare de mai sus pentru a incepe gestionarea echipamentelor medicale.</p>
                
                <div class="feature-grid">
                    <div class="feature-card add-equipment">
                        <i class="fas fa-plus-circle"></i>
                        <h4>Adauga Echipament</h4>
                        <p>Inregistreaza echipamente medicale noi cu generare automata de ID si atribuire cod de bare.</p>
                    </div>
                    
                    <div class="feature-card search">
                        <i class="fas fa-search"></i>
                        <h4>Cautare Rapida</h4>
                        <p>Gaseste echipamente instantaneu folosind scanarea codului de bare sau cautarea manuala.</p>
                    </div>
                    
                    <div class="feature-card service">
                        <i class="fas fa-tools"></i>
                        <h4>Urmarire Service</h4>
                        <p>Monitorizeaza programarile de service si primeste alerte pentru intretinerea viitoare.</p>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="app.js"></script>
</body>
</html>