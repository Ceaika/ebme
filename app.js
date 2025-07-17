let alertsCount = 0;

// load stats on page load with animation
document.addEventListener('DOMContentLoaded', function() {
    loadStats();
    loadAlertStatus();
    // auto-focus barcode input
    document.getElementById('barcodeInput').focus();
});

function goHome() {
    // reset to dashboard view
    document.getElementById('main-content').innerHTML = `
        <h3><i class="fas fa-tachometer-alt"></i> Panou de Control</h3>
        <p class="text-muted" style="font-size: 1.125rem; margin-bottom: 24px;">Bun venit in GBGIMS. Foloseste butoanele de navigare de mai sus pentru a incepe gestionarea echipamentelor medicale.</p>
        
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
    `;
    
    // clear search inputs
    document.getElementById('barcodeInput').value = '';
    document.getElementById('headerBarcodeInput').value = '';
    document.getElementById('barcode-results').innerHTML = '';
}

function headerBarcodeSearch(event) {
    if (event.key === 'Enter' || event.target.value.length > 2) {
        const searchTerm = event.target.value.trim();
        if (searchTerm) {
            // Quick search - search across multiple fields
            fetch(`api.php?action=quick_search&term=${encodeURIComponent(searchTerm)}`)
                .then(response => response.json())
                .then(data => {
                    displaySearchResults(data, `Rezultate pentru: "${searchTerm}"`);
                });
        } else {
            document.getElementById('barcode-results').innerHTML = '';
        }
    }
}

function displaySearchResults(data, title) {
    let html = '';
    if (data.length > 0) {
        if (data.length === 1) {
            // Single result - show detailed info
            const equipment = data[0];
            html = `
                <div class="alert alert-success">
                    <i class="fas fa-check-circle" style="font-size: 1.25rem;"></i>
                    <div>
                        <h4 style="margin-bottom: 8px;">Echipament Gasit!</h4>
                        <p><strong>ID:</strong> ${equipment.id} | <strong>Nume:</strong> ${equipment.name}</p>
                        <p><strong>Producator:</strong> ${equipment.producer} | <strong>Tip:</strong> ${equipment.type}</p>
                        <p><strong>Locatie:</strong> ${equipment.location}${equipment.sub_location ? ' - ' + equipment.sub_location : ''}</p>
                        <button onclick="viewEquipment('${equipment.id}')" class="btn" style="margin-top: 8px; background: var(--primary-green-dark); color: white; border: 2px solid transparent;"><i class="fas fa-eye"></i> Vezi Detalii</button>
                    </div>
                </div>
            `;
        } else {
            // show compact list
            html = `
                <div class="alert alert-success">
                    <i class="fas fa-search" style="font-size: 1.25rem;"></i>
                    <div>
                        <h4 style="margin-bottom: 12px;">${title} (${data.length} rezultate)</h4>
                        <div style="max-height: 200px; overflow-y: auto;">
            `;
            data.forEach(equipment => {
                html += `
                    <div style="padding: 8px; margin: 4px 0; background: rgba(255,255,255,0.5); border-radius: 6px; border-left: 3px solid var(--primary-green);">
                        <strong>${equipment.id}</strong> - ${equipment.name}
                        <br><small>${equipment.producer} | ${equipment.location}</small>
                        <button onclick="viewEquipment('${equipment.id}')" class="btn" style="font-size: 11px; padding: 4px 8px; margin-left: 8px; background: var(--primary-green-dark); color: white; border: 2px solid transparent;">Vezi</button>
                    </div>
                `;
            });
            html += `
                        </div>
                        <button onclick="showSearchResults()" class="btn" style="margin-top: 8px; background: var(--primary-green-dark); color: white; border: 2px solid transparent;"><i class="fas fa-list"></i> Vezi Toate Rezultatele</button>
                    </div>
                </div>
            `;
        }
    } else {
        html = '<div class="alert alert-error"><i class="fas fa-times-circle" style="font-size: 1.25rem;"></i><div>Nu s-au gasit echipamente.</div></div>';
    }
    document.getElementById('barcode-results').innerHTML = html;
}

function showSearchResults() {
    document.getElementById('barcode-results').innerHTML = '';
    const searchTerm = document.getElementById('headerBarcodeInput').value.trim();
    if (searchTerm) {
        document.getElementById('main-content').innerHTML = '<div class="loading">Se incarca rezultatele cautarii...</div>';
        
        fetch(`api.php?action=quick_search&term=${encodeURIComponent(searchTerm)}`)
            .then(response => response.json())
            .then(data => {
                let html = `<h3><i class="fas fa-search"></i> Rezultate Cautare: "${searchTerm}"</h3>`;
                if (data.length > 0) {
                    html += '<div class="table-container"><table><thead><tr>';
                    html += '<th>ID</th><th>Nume</th><th>Producator</th><th>Tip</th><th>Locatie</th><th>Status Service</th><th>Actiuni</th>';
                    html += '</tr></thead><tbody>';
                    
                    data.forEach(equipment => {
                        const serviceStatus = getServiceStatus(equipment.due_date_service);
                        html += `
                            <tr>
                                <td><span class="mono" style="font-weight: 600; color: var(--primary-green);">${equipment.id}</span></td>
                                <td><strong>${equipment.name}</strong></td>
                                <td>${equipment.producer}</td>
                                <td><span class="badge">${equipment.type}</span></td>
                                <td>${equipment.location}${equipment.sub_location ? '<br><small class="text-muted">' + equipment.sub_location + '</small>' : ''}</td>
                                <td class="${serviceStatus.class}">${serviceStatus.text}</td>
                                <td>
                                    <button onclick="viewEquipment('${equipment.id}')" class="btn" style="font-size: 12px; padding: 6px 12px; margin-right: 4px; background: var(--primary-green-dark); color: white; border: 2px solid transparent;"><i class="fas fa-eye"></i></button>
                                    <button onclick="editEquipment('${equipment.id}')" class="btn btn-warning" style="font-size: 12px; padding: 6px 12px;"><i class="fas fa-edit"></i></button>
                                </td>
                            </tr>
                        `;
                    });
                    html += '</tbody></table></div>';
                } else {
                    html += '<div style="text-align: center; padding: 60px; color: var(--gray-500);"><i class="fas fa-search" style="font-size: 3rem; margin-bottom: 16px; display: block;"></i><p>Nu s-au gasit echipamente pentru termenul cautat.</p></div>';
                }
                document.getElementById('main-content').innerHTML = html;
            });
    }
}

function loadAlertStatus() {
    fetch('api.php?action=service_alerts')
        .then(response => response.json())
        .then(data => {
            alertsCount = data.length;
            const alertIndicator = document.getElementById('alertIndicator');
            const alertCountElement = document.getElementById('alertCount');
            
            if (alertsCount > 0) {
                alertIndicator.className = 'alert-indicator has-alerts';
                alertCountElement.style.display = 'flex';
                alertCountElement.textContent = alertsCount;
            } else {
                alertIndicator.className = 'alert-indicator no-alerts';
                alertCountElement.style.display = 'none';
            }
        })
        .catch(error => {
            console.error('Eroare la incarcarea alertelor:', error);
        });
}

function animateNumber(element, target) {
    let current = 0;
    const increment = target / 30;
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        element.textContent = Math.floor(current);
    }, 30);
}

function loadStats() {
    fetch('api.php?action=stats')
        .then(response => response.json())
        .then(data => {
            animateNumber(document.getElementById('total-count'), data.total);
            animateNumber(document.getElementById('due-soon-count'), data.due_soon);
            animateNumber(document.getElementById('overdue-count'), data.overdue);
            animateNumber(document.getElementById('types-count'), data.types);
        })
        .catch(error => {
            console.error('Eroare la incarcarea statisticilor:', error);
        });
}

function showAllEquipment() {
    document.getElementById('main-content').innerHTML = '<div class="loading">Se incarca datele echipamentelor...</div>';
    
    fetch('api.php?action=all')
        .then(response => response.json())
        .then(data => {
            let html = '<h3><i class="fas fa-list"></i> Toate Echipamentele</h3>';
            if (data.length > 0) {
                html += '<div class="table-container"><table><thead><tr>';
                html += '<th>Barcode</th><th>Nume</th><th>Tip</th><th>Locatie</th><th>Status Service</th><th>Foaie de Serviciu</th><th>Actiuni</th>';
                html += '</tr></thead><tbody>';
                
                data.forEach(equipment => {
                    const serviceStatus = getServiceStatus(equipment.due_date_service);
                    html += `
                        <tr>
                            <td><span class="mono" style="font-weight: 600; color: var(--primary-green);">${equipment.barcode}</span></td>
                            <td><strong>${equipment.name}</strong></td>
                            <td><span class="badge">${equipment.type}</span></td>
                            <td>${equipment.location}${equipment.sub_location ? '<br><small class="text-muted">' + equipment.sub_location + '</small>' : ''}</td>
                            <td class="${serviceStatus.class}">${serviceStatus.text}</td>
                            <td>${equipment.instruction_manual ? 
                                '<a href="uploads/manuals/' + equipment.instruction_manual + '" target="_blank" style="color: var(--primary-green); text-decoration: none;"><i class="fas fa-file-pdf"></i> Vezi PDF</a>' : 
                                '<span class="text-muted">Fara foaie de serviciu</span>'}</td>
                            <td>
                                <button onclick="viewEquipment('${equipment.id}')" class="btn" style="font-size: 12px; padding: 6px 12px; margin-right: 4px; background: var(--primary-green-dark); color: white; border: 2px solid transparent;"><i class="fas fa-eye"></i></button>
                                <button onclick="editEquipment('${equipment.id}')" class="btn btn-warning" style="font-size: 12px; padding: 6px 12px;"><i class="fas fa-edit"></i></button>
                            </td>
                        </tr>
                    `;
                });
                html += '</tbody></table></div>';
            } else {
                html += '<div style="text-align: center; padding: 60px; color: var(--gray-500);"><i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 16px; display: block;"></i><p>Nu s-au gasit echipamente</p></div>';
            }
            document.getElementById('main-content').innerHTML = html;
        });
}

function handleBarcodeInput(event) {
    if (event.key === 'Enter' || event.target.value.length > 8) {
        const barcode = event.target.value.trim();
        if (barcode) {
            //  barcode_lookup endpoint
            fetch(`api.php?action=barcode_lookup&barcode=${encodeURIComponent(barcode)}`)
                .then(response => response.json())
                .then(data => {
    if (data.success && data.found) {
        // equipm already in DB
        const equipment = data.equipment;
        let html = `
            <div class="alert alert-success">
                <i class="fas fa-check-circle" style="font-size: 1.25rem;"></i>
                <div>
                    <h4 style="margin-bottom: 8px;">Echipament Existent Gasit!</h4>
                    <p><strong>ID:</strong> ${equipment.id} | <strong>Nume:</strong> ${equipment.name}</p>
                    <p><strong>Producator:</strong> ${equipment.producer} | <strong>Tip:</strong> ${equipment.type}</p>
                    <p><strong>Locatie:</strong> ${equipment.location}${equipment.sub_location ? ' - ' + equipment.sub_location : ''}</p>
                    <p><strong>Cod Serial:</strong> ${equipment.serial_code} | <strong>Cod de Bare:</strong> ${equipment.barcode || 'N/A'}</p>
                    <div style="margin-top: 12px;">
                        <button onclick="viewEquipment('${equipment.id}')" class="btn" style="background: var(--primary-green-dark); color: white; border: 2px solid transparent;"><i class="fas fa-eye"></i> Vezi Detalii</button>
                        <button onclick="editEquipment('${equipment.id}')" class="btn btn-warning" style="margin-left: 8px;"><i class="fas fa-edit"></i> Editeaza</button>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('barcode-results').innerHTML = html;

    } else if (data.autofill && data.product) {
        // new barcode + autofill data found
        showAutoPopulatedForm(data.product, barcode);

    } else {
    
        showManualEntryForm(barcode);
    }
})

                .catch(error => {
                    console.error('Eroare la cautarea codului de bare:', error);
                    showManualEntryForm(barcode);
                });
        } else {
            document.getElementById('barcode-results').innerHTML = '';
        }
    }
}



function showAutoPopulatedForm(productData, barcode) {
    let html = `
        <div class="alert alert-success">
            <i class="fas fa-magic" style="font-size: 1.25rem;"></i>
            <div>
                <h4 style="margin-bottom: 12px;">Date Automate Gasite!</h4>
                <p>Am gasit informatii pentru acest cod de bare. Verifica si completeaza datele:</p>
            </div>
        </div>
        
        <div style="background: linear-gradient(135deg, var(--accent-green-light), var(--white)); padding: 24px; border-radius: var(--border-radius); border: 2px solid var(--accent-green); margin-top: 16px;">
            <h4><i class="fas fa-plus-circle"></i> Adauga Echipament Nou - Date Auto-Complete</h4>
            <form id="autoEquipmentForm" onsubmit="saveAutoEquipment(event)" style="margin-top: 20px;">
                <div class="form-grid">
                    <div class="form-group">
                        <label for="auto_name">Nume Echipament *</label>
                        <input type="text" id="auto_name" name="name" required value="${productData.name || ''}" placeholder="Editeaza numele echipamentului">
                    </div>
                    <div class="form-group">
                        <label for="auto_producer">Producator/Fabricant *</label>
                        <input type="text" id="auto_producer" name="producer" required value="${productData.manufacturer || productData.brand || ''}" placeholder="Editeaza producatorul">
                    </div>
                    <div class="form-group">
                        <label for="auto_type">Tip Echipament *</label>
                        <select id="auto_type" name="type" required>
                            <option value="">Selecteaza Tipul</option>
                            <option value="Aparat Raze X" ${productData.category === 'X-Ray' ? 'selected' : ''}>Aparat Raze X</option>
                            <option value="Ecograf" ${productData.category === 'Ultrasound' ? 'selected' : ''}>Ecograf</option>
                            <option value="Monitor Pacient" ${productData.category === 'Monitor' ? 'selected' : ''}>Monitor Pacient</option>
                            <option value="Defibrillator" ${productData.category === 'Defibrillator' ? 'selected' : ''}>Defibrillator</option>
                            <option value="Pompa de Perfuzie" ${productData.category === 'Pump' ? 'selected' : ''}>Pompa de Perfuzie</option>
                            <option value="Scanner CT" ${productData.category === 'CT' ? 'selected' : ''}>Scanner CT</option>
                            <option value="Scanner RMN" ${productData.category === 'MRI' ? 'selected' : ''}>Scanner RMN</option>
                            <option value="Ventilator" ${productData.category === 'Ventilator' ? 'selected' : ''}>Ventilator</option>
                            <option value="Aparat Anestezie" ${productData.category === 'Anesthesia' ? 'selected' : ''}>Aparat Anestezie</option>
                            <option value="Altele" ${!productData.category ? 'selected' : ''}>Altele</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="auto_serial_code">Cod Serial *</label>
                        <input type="text" id="auto_serial_code" name="serial_code" required value="${productData.serial || ''}" placeholder="Introduce codul serial">
                    </div>
                    <div class="form-group">
                        <label for="auto_location">Locatie *</label>
                        <input type="text" id="auto_location" name="location" required placeholder="ex. Departamentul de Urgenta">
                    </div>
                    <div class="form-group">
                        <label for="auto_sub_location">Sub-Locatie</label>
                        <input type="text" id="auto_sub_location" name="sub_location" placeholder="ex. Sala 101, Patul 5">
                    </div>
                    <div class="form-group">
                        <label for="auto_due_date_service">Data Service</label>
                        <input type="date" id="auto_due_date_service" name="due_date_service">
                    </div>
                    <div class="form-group">
                        <label for="auto_barcode">Cod de Bare</label>
                        <input type="text" id="auto_barcode" name="barcode" value="${barcode}" readonly style="background: var(--gray-100);">
                    </div>
                </div>
                <div class="form-group">
                    <label for="auto_instruction_manual">Foaie de Serviciu(PDF)</label>
                    <input type="file" id="auto_instruction_manual" name="instruction_manual" accept=".pdf">
                    <small class="text-muted">Incarca foaia de serviciu PDF daca este disponibil</small>
                </div>
                <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-top: 20px;">
                    <button type="submit" class="btn btn-success"><i class="fas fa-save"></i> Salveaza Echipament</button>
                    <button type="button" class="btn btn-warning" onclick="showManualEntryForm('${barcode}')"><i class="fas fa-edit"></i>Introdu Foaie de Serviciu</button>
                    <button type="button" class="btn btn-close" onclick="clearBarcodeInput()"><i class="fas fa-times"></i> Anuleaza</button>
                </div>
            </form>
            <div id="auto-add-result"></div>
        </div>
    `;
    
    document.getElementById('barcode-results').innerHTML = html;
    
    // set default service date (1 an de acum)
    const today = new Date();
    today.setFullYear(today.getFullYear() + 1);
    document.getElementById('auto_due_date_service').value = today.toISOString().split('T')[0];
    
    // autofill fields when manually entering a barcode in Add Equipment page
document.getElementById('barcode').addEventListener('blur', () => {
    const barcode = document.getElementById('barcode').value.trim();
    if (barcode.length >= 8) {
        fetch(`api.php?action=barcode_lookup&barcode=${encodeURIComponent(barcode)}`)
            .then(response => response.json())
            .then(data => {
                if (data.autofill && data.product) {
                    document.getElementById('name').value = data.product.name || '';
                    document.getElementById('producer').value = data.product.manufacturer || data.product.brand || '';
                    document.getElementById('serial_code').value = data.product.serial || '';

                    // fetch category to dropdown
                    if (data.product.category) {
                        const typeSelect = document.getElementById('type');
                        for (let option of typeSelect.options) {
                            if (option.text.toLowerCase().includes(data.product.category.toLowerCase())) {
                                typeSelect.value = option.value;
                                break;
                            }
                        }
                    }
                }
            });
    }
});

    // Focus on location field since other fields are pre-filled
    document.getElementById('auto_location').focus();
}

// Update showManualEntryForm to have a different message
function showManualEntryForm(barcode) {
    let html = `
        <div class="alert alert-warning">
            <i class="fas fa-barcode" style="font-size: 1.25rem;"></i>
            <div>
                <h4 style="margin-bottom: 8px;">Cod de Bare Nou</h4>
                <p>Acest cod de bare nu exista in baza de date. Adauga un echipament nou:</p>
            </div>
        </div>
        
        <div style="background: linear-gradient(135deg, var(--accent-green-light), var(--white)); padding: 24px; border-radius: var(--border-radius); border: 2px solid var(--accent-green); margin-top: 16px;">
            <h4><i class="fas fa-plus-circle"></i> Adauga Echipament Nou</h4>
            <form id="manualEquipmentForm" onsubmit="saveManualEquipment(event)" style="margin-top: 20px;">
                <div class="form-grid">
                    <div class="form-group">
                        <label for="manual_name">Nume Echipament *</label>
                        <input type="text" id="manual_name" name="name" required placeholder="Introduce numele echipamentului">
                    </div>
                    <div class="form-group">
                        <label for="manual_serial_code">Cod Serial *</label>
                        <input type="text" id="manual_serial_code" name="serial_code" required placeholder="Introduce numarul de serie">
                    </div>
                    <div class="form-group">
                        <label for="manual_producer">Producator/Fabricant *</label>
                        <input type="text" id="manual_producer" name="producer" required placeholder="Introduce fabricantul">
                    </div>
                    <div class="form-group">
                        <label for="manual_type">Tip Echipament *</label>
                        <select id="manual_type" name="type" required>
                            <option value="">Selecteaza Tipul</option>
                            <option value="Aparat Raze X">Aparat Raze X</option>
                            <option value="Ecograf">Ecograf</option>
                            <option value="Monitor Pacient">Monitor Pacient</option>
                            <option value="Defibrillator">Defibrillator</option>
                            <option value="Pompa de Perfuzie">Pompa de Perfuzie</option>
                            <option value="Scanner CT">Scanner CT</option>
                            <option value="Scanner RMN">Scanner RMN</option>
                            <option value="Ventilator">Ventilator</option>
                            <option value="Aparat Anestezie">Aparat Anestezie</option>
                            <option value="Altele">Altele</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="manual_location">Locatie *</label>
                        <input type="text" id="manual_location" name="location" required placeholder="ex. Departamentul de Urgenta">
                    </div>
                    <div class="form-group">
                        <label for="manual_sub_location">Sub-Locatie</label>
                        <input type="text" id="manual_sub_location" name="sub_location" placeholder="ex. Sala 101, Patul 5">
                    </div>
                    <div class="form-group">
                        <label for="manual_due_date_service">Data Scadenta Service</label>
                        <input type="date" id="manual_due_date_service" name="due_date_service">
                    </div>
                    <div class="form-group">
                        <label for="manual_barcode">Cod de Bare</label>
                        <input type="text" id="manual_barcode" name="barcode" value="${barcode}" readonly style="background: var(--gray-100);">
                    </div>
                </div>
                <div class="form-group">
                    <label for="manual_instruction_manual">Foaie de Serviciu (PDF)</label>
                    <input type="file" id="manual_instruction_manual" name="instruction_manual" accept=".pdf">
                    <small class="text-muted">Incarca doar fisiere PDF</small>
                </div>
                <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-top: 20px;">
                    <button type="submit" class="btn btn-success"><i class="fas fa-save"></i> Salveaza Echipament</button>
                    <button type="button" class="btn btn-close" onclick="clearBarcodeInput()"><i class="fas fa-times"></i> Anuleaza</button>
                </div>
            </form>
            <div id="manual-add-result"></div>
        </div>
    `;
    
    document.getElementById('barcode-results').innerHTML = html;
    
    // default service date un an de acum
    const today = new Date();
    today.setFullYear(today.getFullYear() + 1);
    document.getElementById('manual_due_date_service').value = today.toISOString().split('T')[0];
    
    // focus on name field
    document.getElementById('manual_name').focus();
}

function searchBarcode(event) {
    handleBarcodeInput(event);
}


function saveManualEquipment(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    
    document.getElementById('manual-add-result').innerHTML = '<div class="loading">Se salveaza echipamentul...</div>';
    
    fetch('save_equipment.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            document.getElementById('manual-add-result').innerHTML = `
                <div class="alert alert-success">
                    <i class="fas fa-check-circle" style="font-size: 1.25rem;"></i>
                    <div>
                        <h4>Succes!</h4>
                        <p>Echipament adaugat manual cu ID: <strong>${data.equipment_id}</strong></p>
                        <div style="margin-top: 12px;">
                            <button onclick="viewEquipment('${data.equipment_id}')" class="btn" style="background: var(--primary-green-dark); color: white; border: 2px solid transparent;"><i class="fas fa-eye"></i> Vezi Echipament</button>
                            <button onclick="clearBarcodeInput()" class="btn btn-success"><i class="fas fa-barcode"></i> Scaneaza Altul</button>
                        </div>
                    </div>
                </div>
            `;
            // clr form
            event.target.reset();
            // reload stats and alerts
            loadStats();
            loadAlertStatus();
        } else {
            document.getElementById('manual-add-result').innerHTML = `
                <div class="alert alert-error">
                    <i class="fas fa-times-circle" style="font-size: 1.25rem;"></i>
                    <div>
                        <h4>Eroare</h4>
                        <p>${data.error}</p>
                    </div>
                </div>
            `;
        }
    })
    .catch(error => {
        document.getElementById('manual-add-result').innerHTML = `
            <div class="alert alert-error">
                <i class="fas fa-times-circle" style="font-size: 1.25rem;"></i>
                <div>
                    <h4>Eroare</h4>
                    <p>Eroare la salvarea echipamentului: ${error.message}</p>
                </div>
            </div>
        `;
    });
}

function clearBarcodeInput() {
    document.getElementById('barcodeInput').value = '';
    document.getElementById('barcode-results').innerHTML = '';
    document.getElementById('barcodeInput').focus();
}



function showServiceAlerts() {
    document.getElementById('main-content').innerHTML = '<div class="loading">Se incarca alertele de service...</div>';
    
    fetch('api.php?action=service_alerts')
        .then(response => response.json())
        .then(data => {
            let html = '<h3><i class="fas fa-exclamation-triangle"></i> Alerte Service</h3>';
            if (data.length > 0) {
                html += '<div class="table-container"><table><thead><tr>';
                html += '<th>ID</th><th>Echipament</th><th>Locatie</th><th>Status</th><th>Zile</th><th>Actiune</th>';
                html += '</tr></thead><tbody>';
                data.forEach(equipment => {
                    const serviceStatus = getServiceStatus(equipment.due_date_service);
                    html += `
                        <tr>
                            <td><span class="mono" style="font-weight: 600; color: var(--primary-green);">${equipment.id}</span></td>
                            <td><strong>${equipment.name}</strong></td>
                            <td>${equipment.location}</td>
                            <td class="${serviceStatus.class}">${serviceStatus.text}</td>
                            <td>${serviceStatus.days}</td>
                            <td><button onclick="viewEquipment('${equipment.id}')" class="btn" style="font-size: 12px; padding: 6px 12px; background: var(--primary-green-dark); color: white; border: 2px solid transparent;"><i class="fas fa-eye"></i> Vezi</button></td>
                        </tr>
                    `;
                });
                html += '</tbody></table></div>';
            } else {
                html += '<div class="alert alert-success"><i class="fas fa-check-circle" style="font-size: 1.25rem;"></i><div><strong>Toate la zi!</strong> Nu exista alerte de service - toate echipamentele sunt la zi.</div></div>';
            }
            document.getElementById('main-content').innerHTML = html;
        });
}

function getServiceStatus(dueDate) {
    if (!dueDate) return { class: '', text: 'Neprogramat', days: '-' };
    
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
        return { class: 'status-overdue', text: 'Intarziat', days: Math.abs(diffDays) + ' zile in urma' };
    } else if (diffDays <= 30) {
        return { class: 'status-warning', text: 'In curand', days: diffDays + ' zile' };
    } else {
        return { class: 'status-ok', text: due.toLocaleDateString(), days: diffDays + ' zile' };
    }
}

function viewEquipment(id) {
    document.getElementById('barcode-results').innerHTML = '';
    document.getElementById('main-content').innerHTML = '<div class="loading">Se incarca detaliile echipamentului...</div>';
    
    fetch(`api.php?action=view&id=${id}`)
        .then(response => response.json())
        .then(equipment => {
            const serviceStatus = getServiceStatus(equipment.due_date_service);
            let html = `
                <h3><i class="fas fa-info-circle"></i> Detalii Echipament - ${equipment.id}</h3>
                <div style="background: linear-gradient(135deg, var(--gray-50), var(--white)); padding: 24px; border-radius: var(--border-radius); border: 1px solid var(--gray-200); margin-bottom: 24px;">
                    <div class="form-grid">
                        <div>
                            <div style="margin-bottom: 16px;">
                                <label style="display: block; margin-bottom: 6px; font-weight: 600; color: var(--gray-700); font-size: 0.875rem;">Nume Echipament</label>
                                <div style="font-size: 1.125rem; font-weight: 600; color: var(--gray-800);">${equipment.name}</div>
                            </div>
                            
                            <div style="margin-bottom: 16px;">
                                <label style="display: block; margin-bottom: 6px; font-weight: 600; color: var(--gray-700); font-size: 0.875rem;">Cod Serial</label>
                                <div class="mono" style="background: var(--gray-100); padding: 8px 12px; border-radius: 6px;">${equipment.serial_code}</div>
                            </div>
                            
                            <div style="margin-bottom: 16px;">
                                <label style="display: block; margin-bottom: 6px; font-weight: 600; color: var(--gray-700); font-size: 0.875rem;">Producator</label>
                                <div style="color: var(--gray-700);">${equipment.producer}</div>
                            </div>
                            
                            <div style="margin-bottom: 16px;">
                                <label style="display: block; margin-bottom: 6px; font-weight: 600; color: var(--gray-700); font-size: 0.875rem;">Tip Echipament</label>
                                <div class="badge badge-primary">${equipment.type}</div>
                            </div>
                        </div>
                        <div>
                            <div style="margin-bottom: 16px;">
                                <label style="display: block; margin-bottom: 6px; font-weight: 600; color: var(--gray-700); font-size: 0.875rem;">Locatie</label>
                                <div style="color: var(--gray-700);">${equipment.location}</div>
                            </div>
                            
                            <div style="margin-bottom: 16px;">
                                <label style="display: block; margin-bottom: 6px; font-weight: 600; color: var(--gray-700); font-size: 0.875rem;">Sub-locatie</label>
                                <div style="color: var(--gray-700);">${equipment.sub_location || 'Nespecificat'}</div>
                            </div>
                            
                            <div style="margin-bottom: 16px;">
                                <label style="display: block; margin-bottom: 6px; font-weight: 600; color: var(--gray-700); font-size: 0.875rem;">Status Service</label>
                                <div class="${serviceStatus.class}" style="font-size: 1.125rem; font-weight: 600;">${serviceStatus.text}</div>
                            </div>
                            
                            <div style="margin-bottom: 16px;">
                                <label style="display: block; margin-bottom: 6px; font-weight: 600; color: var(--gray-700); font-size: 0.875rem;">Cod de Bare</label>
                                <div class="mono" style="background: var(--gray-100); padding: 8px 12px; border-radius: 6px;">${equipment.barcode || 'Neatribuit'}</div>
                            </div>
                        </div>
                    </div>
                    <div style="margin-top: 20px;">
                        <label style="display: block; margin-bottom: 6px; font-weight: 600; color: var(--gray-700); font-size: 0.875rem;"> Foaie de Serviciu </label>
                        <div>${equipment.instruction_manual ? 
                            '<a href="uploads/manuals/' + equipment.instruction_manual + '" target="_blank" class="btn btn-primary" style="font-size: 0.875rem; padding: 8px 16px;"><i class="fas fa-file-pdf"></i> Vezi Manual PDF</a>' : 
                            '<span class="text-muted">Foaie de serviciu inexistenta</span>'
                        }</div>
                    </div>
                </div>
                <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                    <button onclick="editEquipment('${equipment.id}')" class="btn btn-warning"><i class="fas fa-edit"></i> Editeaza Echipament</button>
                    <button onclick="showAllEquipment()" class="btn btn-close"><i class="fas fa-arrow-left"></i> Inapoi la Lista</button>
                </div>
            `;
            document.getElementById('main-content').innerHTML = html;
        });
}

function showAddForm() {
    document.getElementById('main-content').innerHTML = `
        <h3><i class="fas fa-plus"></i> Adauga Echipament Nou</h3>
        <form id="addEquipmentForm" onsubmit="saveEquipment(event)" style="background: linear-gradient(135deg, var(--gray-50), var(--white)); padding: 24px; border-radius: var(--border-radius); border: 1px solid var(--gray-200);">
            <div class="form-grid">
                <div class="form-group">
                    <label for="name">Nume Echipament *</label>
                    <input type="text" id="name" name="name" required placeholder="Introduce numele echipamentului">
                </div>
                <div class="form-group">
                    <label for="serial_code">Cod Serial *</label>
                    <input type="text" id="serial_code" name="serial_code" required placeholder="Introduce numarul de serie">
                </div>
                <div class="form-group">
                    <label for="producer">Producator/Fabricant *</label>
                    <input type="text" id="producer" name="producer" required placeholder="Introduce fabricantul">
                </div>
                <div class="form-group">
                    <label for="type">Tip Echipament *</label>
                    <select id="type" name="type" required>
                        <option value="">Selecteaza Tipul</option>
                        <option value="Aparat Raze X">Aparat Raze X</option>
                        <option value="Ecograf">Ecograf</option>
                        <option value="Monitor Pacient">Monitor Pacient</option>
                        <option value="Defibrillator">Defibrillator</option>
                        <option value="Pompa de Perfuzie">Pompa de Perfuzie</option>
                        <option value="Scanner CT">Scanner CT</option>
                        <option value="Scanner RMN">Scanner RMN</option>
                        <option value="Ventilator">Ventilator</option>
                        <option value="Aparat Anestezie">Aparat Anestezie</option>
                        <option value="Altele">Altele</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="location">Locatie *</label>
                    <input type="text" id="location" name="location" required placeholder="ex. Departamentul de Urgenta">
                </div>
                <div class="form-group">
                    <label for="sub_location">Sub-Locatie</label>
                    <input type="text" id="sub_location" name="sub_location" placeholder="ex. Sala 101, Patul 5">
                </div>
                <div class="form-group">
                    <label for="due_date_service">Data Scadenta Service</label>
                    <input type="date" id="due_date_service" name="due_date_service">
                </div>
                <div class="form-group">
                    <label for="barcode">Cod de Bare</label>
                    <input type="text" id="barcode" name="barcode" placeholder="Lasa gol pentru generare automata">
                </div>
            </div>
            <div class="form-group">
                <label for="instruction_manual">Foaie de Serviciu (PDF)</label>
                <input type="file" id="instruction_manual" name="instruction_manual" accept=".pdf">
                <small class="text-muted">Incarca doar fisiere PDF</small>
            </div>
            <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                <button type="submit" class="btn btn-success"><i class="fas fa-save"></i> Adauga Echipament</button>
                <button type="button" class="btn btn-primary" onclick="showAllEquipment()"><i class="fas fa-times"></i> Anuleaza</button>
            </div>
        </form>
        <div id="add-result"></div>
    `;
    
    // Set default service date (1 year from now)
    const today = new Date();
    today.setFullYear(today.getFullYear() + 1);
    document.getElementById('due_date_service').value = today.toISOString().split('T')[0];
}

function saveEquipment(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    
    // Show loading message
    document.getElementById('add-result').innerHTML = '<div class="loading">Se salveaza echipamentul...</div>';
    
    fetch('save_equipment.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            document.getElementById('add-result').innerHTML = `
                <div class="alert alert-success">
                    <i class="fas fa-check-circle" style="font-size: 1.25rem;"></i>
                    <div>
                        <h4>Succes!</h4>
                        <p>Echipament adaugat cu ID: <strong>${data.equipment_id}</strong></p>
                        <div style="margin-top: 12px;">
                            <button onclick="viewEquipment('${data.equipment_id}')" class="btn" style="background: var(--primary-green-dark); color: white; border: 2px solid transparent;"><i class="fas fa-eye"></i> Vezi Echipament</button>
                            <button onclick="showAddForm()" class="btn btn-success"><i class="fas fa-plus"></i> Adauga Altul</button>
                        </div>
                    </div>
                </div>
            `;
            // Clear form
            event.target.reset();
            // Reload stats and alerts
            loadStats();
            loadAlertStatus();
        } else {
            document.getElementById('add-result').innerHTML = `
                <div class="alert alert-error">
                    <i class="fas fa-times-circle" style="font-size: 1.25rem;"></i>
                    <div>
                        <h4>Eroare</h4>
                        <p>${data.error}</p>
                    </div>
                </div>
            `;
        }
    })
    .catch(error => {
        document.getElementById('add-result').innerHTML = `
            <div class="alert alert-error">
                <i class="fas fa-times-circle" style="font-size: 1.25rem;"></i>
                <div>
                    <h4>Eroare</h4>
                    <p>Eroare la salvarea echipamentului: ${error.message}</p>
                </div>
            </div>
        `;
    });
}

function editEquipment(id) {
    document.getElementById('main-content').innerHTML = '<div class="loading">Se incarca echipamentul pentru editare...</div>';
    
    // First fetch the equipment data
    fetch(`api.php?action=view&id=${id}`)
        .then(response => response.json())
        .then(equipment => {
            if (equipment.error) {
                alert('Eroare la incarcarea echipamentului: ' + equipment.error);
                return;
            }
            
            document.getElementById('main-content').innerHTML = `
                <h3><i class="fas fa-edit"></i> Editeaza Echipament - ${equipment.id}</h3>
                <form id="editEquipmentForm" onsubmit="updateEquipment(event, '${id}')" style="background: linear-gradient(135deg, var(--gray-50), var(--white)); padding: 24px; border-radius: var(--border-radius); border: 1px solid var(--gray-200);">
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="edit_name">Nume Echipament *</label>
                            <input type="text" id="edit_name" name="name" required value="${equipment.name}">
                        </div>
                        <div class="form-group">
                            <label for="edit_serial_code">Cod Serial *</label>
                            <input type="text" id="edit_serial_code" name="serial_code" required value="${equipment.serial_code}">
                        </div>
                        <div class="form-group">
                            <label for="edit_producer">Producator/Fabricant *</label>
                            <input type="text" id="edit_producer" name="producer" required value="${equipment.producer}">
                        </div>
                        <div class="form-group">
                            <label for="edit_type">Tip Echipament *</label>
                            <select id="edit_type" name="type" required>
                                <option value="Aparat Raze X" ${equipment.type === 'Aparat Raze X' ? 'selected' : ''}>Aparat Raze X</option>
                                <option value="Ecograf" ${equipment.type === 'Ecograf' ? 'selected' : ''}>Ecograf</option>
                                <option value="Monitor Pacient" ${equipment.type === 'Monitor Pacient' ? 'selected' : ''}>Monitor Pacient</option>
                                <option value="Defibrillator" ${equipment.type === 'Defibrillator' ? 'selected' : ''}>Defibrillator</option>
                                <option value="Pompa de Perfuzie" ${equipment.type === 'Pompa de Perfuzie' ? 'selected' : ''}>Pompa de Perfuzie</option>
                                <option value="Scanner CT" ${equipment.type === 'Scanner CT' ? 'selected' : ''}>Scanner CT</option>
                                <option value="Scanner RMN" ${equipment.type === 'Scanner RMN' ? 'selected' : ''}>Scanner RMN</option>
                                <option value="Ventilator" ${equipment.type === 'Ventilator' ? 'selected' : ''}>Ventilator</option>
                                <option value="Aparat Anestezie" ${equipment.type === 'Aparat Anestezie' ? 'selected' : ''}>Aparat Anestezie</option>
                                <option value="Altele" ${equipment.type === 'Altele' ? 'selected' : ''}>Altele</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="edit_location">Locatie *</label>
                            <input type="text" id="edit_location" name="location" required value="${equipment.location}">
                        </div>
                        <div class="form-group">
                            <label for="edit_sub_location">Sub-Locatie</label>
                            <input type="text" id="edit_sub_location" name="sub_location" value="${equipment.sub_location || ''}">
                        </div>
                        <div class="form-group">
                            <label for="edit_due_date_service">Data Scadenta Service</label>
                            <input type="date" id="edit_due_date_service" name="due_date_service" value="${equipment.due_date_service || ''}">
                        </div>
                        <div class="form-group">
                            <label for="edit_barcode">Cod de Bare</label>
                            <input type="text" id="edit_barcode" name="barcode" value="${equipment.barcode || ''}">
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="edit_instruction_manual">Foaie de Serviciu (PDF)</label>
                        <input type="file" id="edit_instruction_manual" name="instruction_manual" accept=".pdf">
                        <small class="text-muted">
                            Manual curent: ${equipment.instruction_manual ? 
                                '<a href="uploads/manuals/' + equipment.instruction_manual + '" target="_blank" style="color: var(--primary-green);">' + equipment.instruction_manual + '</a>' : 
                                'Foaie de Serviciu inexistenta'
                            }
                        </small>
                    </div>
                    <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                        <button type="submit" class="btn btn-warning"><i class="fas fa-save"></i> Actualizeaza Echipament</button>
                        <button type="button" class="btn btn-close" onclick="viewEquipment('${id}')"><i class="fas fa-times"></i> Anuleaza</button>
                        <button type="button" class="btn btn-danger" onclick="deleteEquipment('${id}')"><i class="fas fa-trash"></i> Sterge Echipament</button>
                    </div>
                </form>
                <div id="edit-result"></div>
            `;
        })
        .catch(error => {
            alert('Eroare la incarcarea echipamentului pentru editare: ' + error.message);
        });
}

function updateEquipment(event, id) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    formData.append('id', id);
    formData.append('action', 'update');
    
    document.getElementById('edit-result').innerHTML = '<div class="loading">Se actualizeaza echipamentul...</div>';
    
    fetch('save_equipment.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            document.getElementById('edit-result').innerHTML = `
                <div class="alert alert-success">
                    <i class="fas fa-check-circle" style="font-size: 1.25rem;"></i>
                    <div>
                        <h4>Succes!</h4>
                        <p>Echipament actualizat cu succes!</p>
                        <button onclick="viewEquipment('${id}')" class="btn" style="margin-top: 8px; background: var(--primary-green-dark); color: white; border: 2px solid transparent;"><i class="fas fa-eye"></i> Vezi Echipament</button>
                    </div>
                </div>
            `;
            // reload la stats and alerts
            loadStats();
            loadAlertStatus();
        } else {
            document.getElementById('edit-result').innerHTML = `
                <div class="alert alert-error">
                    <i class="fas fa-times-circle" style="font-size: 1.25rem;"></i>
                    <div>
                        <h4>Eroare</h4>
                        <p>${data.error}</p>
                    </div>
                </div>
            `;
        }
    })
    .catch(error => {
        document.getElementById('edit-result').innerHTML = `
            <div class="alert alert-error">
                <i class="fas fa-times-circle" style="font-size: 1.25rem;"></i>
                <div>
                    <h4>Eroare</h4>
                    <p>Eroare la actualizarea echipamentului: ${error.message}</p>
                </div>
            </div>
        `;
    });
}

function deleteEquipment(id) {
    if (confirm('Esti sigur ca vrei sa stergi acest echipament? Aceasta actiune nu poate fi anulata.')) {
        fetch('save_equipment.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `action=delete&id=${id}`
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Echipament sters cu succes!');
                showAllEquipment();
                loadStats(); // reload la stats dupa deletion
                loadAlertStatus(); // reload la alerts dupa deletion
            } else {
                alert('Eroare la stergerea echipamentului: ' + data.error);
            }
        })
        .catch(error => {
            alert('Eroare la stergerea echipamentului: ' + error.message);
        });
    }
}

function showSearch() {
    document.getElementById('main-content').innerHTML = `
        <h3><i class="fas fa-search"></i> Cautare Avansata</h3>
        <div style="background: linear-gradient(135deg, var(--gray-50), var(--white)); padding: 24px; border-radius: var(--border-radius); border: 1px solid var(--gray-200);">
            <div class="form-grid">
                <div class="form-group">
                    <label for="search_id">ID Echipament</label>
                    <input type="text" id="search_id" placeholder="ex. 000001">
                </div>
                <div class="form-group">
                    <label for="search_name">Nume Echipament</label>
                    <input type="text" id="search_name" placeholder="ex. Ecograf, Monitor">
                </div>
                <div class="form-group">
                    <label for="search_producer">Producator</label>
                    <input type="text" id="search_producer" placeholder="ex. Siemens, GE">
                </div>
                <div class="form-group">
                    <label for="search_type">Tip Echipament</label>
                    <select id="search_type">
                        <option value="">Toate Tipurile</option>
                        <option value="Aparat Raze X">Aparat Raze X</option>
                        <option value="Ecograf">Ecograf</option>
                        <option value="Monitor Pacient">Monitor Pacient</option>
                        <option value="Defibrillator">Defibrillator</option>
                        <option value="Pompa de Perfuzie">Pompa de Perfuzie</option>
                        <option value="Scanner CT">Scanner CT</option>
                        <option value="Scanner RMN">Scanner RMN</option>
                        <option value="Ventilator">Ventilator</option>
                        <option value="Aparat Anestezie">Aparat Anestezie</option>
                        <option value="Altele">Altele</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="search_location">Locatie</label>
                    <input type="text" id="search_location" placeholder="ex. ICU, Urgenta">
                </div>
                <div class="form-group">
                    <label for="search_serial">Cod Serial</label>
                    <input type="text" id="search_serial" placeholder="ex. XR-001">
                </div>
                <div class="form-group">
                    <label for="search_barcode">Cod de Bare</label>
                    <input type="text" id="search_barcode" placeholder="ex. 123456001">
                </div>
                <div class="form-group">
                    <label for="search_service_status">Status Service</label>
                    <select id="search_service_status">
                        <option value="">Toate Statusurile</option>
                        <option value="overdue">Intarziat</option> 
                        <option value="due_soon">In Curand (30 zile)</option>
                        <option value="ok">La Zi</option>
                    </select>
                </div>
            </div>
            <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-top: 20px;">
                <button onclick="performAdvancedSearch()" class="btn" style="background: var(--primary-green-dark); color: white; border: 2px solid transparent;"><i class="fas fa-search"></i> Cauta</button>
                <button onclick="clearAdvancedSearch()" class="btn btn-warning"><i class="fas fa-eraser"></i> Sterge Filtre</button>
                <button onclick="goHome()" class="btn btn-primary"><i class="fas fa-home"></i> Inapoi</button>
            </div>
        </div>
        <div id="advanced-search-results"></div>
    `;
    
    // first input focus
    document.getElementById('search_id').focus();
}

function performAdvancedSearch() {
    const searchParams = {
        id: document.getElementById('search_id').value.trim(),
        name: document.getElementById('search_name').value.trim(),
        producer: document.getElementById('search_producer').value.trim(),
        type: document.getElementById('search_type').value,
        location: document.getElementById('search_location').value.trim(),
        serial: document.getElementById('search_serial').value.trim(),
        barcode: document.getElementById('search_barcode').value.trim(),
        service_status: document.getElementById('search_service_status').value
    };
    
    // remove empty parameters
    const filteredParams = Object.fromEntries(
        Object.entries(searchParams).filter(([key, value]) => value !== '')
    );
    
    if (Object.keys(filteredParams).length === 0) {
        document.getElementById('advanced-search-results').innerHTML = '<div class="alert alert-error"><i class="fas fa-exclamation-triangle"></i><div>Introdu cel putin un criteriu de cautare.</div></div>';
        return;
    }
    
    document.getElementById('advanced-search-results').innerHTML = '<div class="loading">Se cauta echipamentele...</div>';
    
    const queryString = new URLSearchParams(filteredParams).toString();
    
    fetch(`api.php?action=advanced_filter&${queryString}`)
        .then(response => response.json())
        .then(data => {
            let html = `<h4><i class="fas fa-list"></i> Rezultate Cautare (${data.length} echipamente)</h4>`;
            if (data.length > 0) {
                html += '<div class="table-container"><table><thead><tr>';
                html += '<th>ID</th><th>Nume</th><th>Producator</th><th>Tip</th><th>Locatie</th><th>Status Service</th><th>Actiuni</th>';
                html += '</tr></thead><tbody>';
                
                data.forEach(equipment => {
                    const serviceStatus = getServiceStatus(equipment.due_date_service);
                    html += `
                        <tr>
                            <td><span class="mono" style="font-weight: 600; color: var(--primary-green);">${equipment.id}</span></td>
                            <td><strong>${equipment.name}</strong></td>
                            <td>${equipment.producer}</td>
                            <td><span class="badge">${equipment.type}</span></td>
                            <td>${equipment.location}${equipment.sub_location ? '<br><small class="text-muted">' + equipment.sub_location + '</small>' : ''}</td>
                            <td class="${serviceStatus.class}">${serviceStatus.text}</td>
                            <td>
                                <button onclick="viewEquipment('${equipment.id}')" class="btn btn-primary" style="font-size: 12px; padding: 6px 12px; margin-right: 4px;"><i class="fas fa-eye"></i></button>
                                <button onclick="editEquipment('${equipment.id}')" class="btn btn-warning" style="font-size: 12px; padding: 6px 12px;"><i class="fas fa-edit"></i></button>
                            </td>
                        </tr>
                    `;
                });
                html += '</tbody></table></div>';
            } else {
                html += '<div style="text-align: center; padding: 40px; color: var(--gray-500);"><i class="fas fa-search" style="font-size: 3rem; margin-bottom: 16px; display: block;"></i><p>Nu s-au gasit echipamente cu criteriile specificate.</p></div>';
            }
            document.getElementById('advanced-search-results').innerHTML = html;
        })
        .catch(error => {
            document.getElementById('advanced-search-results').innerHTML = '<div class="alert alert-error"><i class="fas fa-times-circle"></i><div>Eroare la cautare: ' + error.message + '</div></div>';
        });
}



function clearAdvancedSearch() {
    document.getElementById('search_id').value = '';
    document.getElementById('search_name').value = '';
    document.getElementById('search_producer').value = '';
    document.getElementById('search_type').value = '';
    document.getElementById('search_location').value = '';
    document.getElementById('search_serial').value = '';
    document.getElementById('search_barcode').value = '';
    document.getElementById('search_service_status').value = '';
    document.getElementById('advanced-search-results').innerHTML = '';
    document.getElementById('search_id').focus();
}

function autoFillBarcodeInAddForm() {
    const barcodeInput = document.getElementById('barcode');
    if (!barcodeInput) return;

    barcodeInput.addEventListener('blur', () => {
        const barcode = barcodeInput.value.trim();
        if (barcode.length >= 8) {
            fetch(`api.php?action=barcode_lookup&barcode=${encodeURIComponent(barcode)}`)
                .then(response => response.json())
                .then(data => {
                    if (data.autofill && data.product) {
                        // fill and add equipm form with data
                        document.getElementById('name').value = data.product.name || '';
                        document.getElementById('producer').value = data.product.manufacturer || data.product.brand || '';
                        document.getElementById('serial_code').value = data.product.serial || '';

                        // type if categ match
                        if (data.product.category) {
                            const typeSelect = document.getElementById('type');
                            for (let option of typeSelect.options) {
                                if (option.text.toLowerCase().includes(data.product.category.toLowerCase())) {
                                    typeSelect.value = option.value;
                                    break;
                                }
                            }
                        }
                    }
                });
        }
    });
}


// Show equipment with service due soon (next 30 days)
function showDueSoonEquipment() {
    document.getElementById('main-content').innerHTML = '<div class="loading">Se incarca echipamentele cu service in curand...</div>';
    
    fetch('api.php?action=service_alerts')
        .then(response => response.json())
        .then(data => {
            // Filter only due soon (not overdue)
            const dueSoonData = data.filter(equipment => {
                const serviceStatus = getServiceStatus(equipment.due_date_service);
                return serviceStatus.class === 'status-warning';
            });
            
            let html = '<h3><i class="fas fa-clock"></i> Echipamente cu Service in Curand</h3>';
            if (dueSoonData.length > 0) {
                html += '<div class="table-container"><table><thead><tr>';
                html += '<th>Barcode</th><th>Nume</th><th>Tip</th><th>Locatie</th><th>Data Service</th><th>Zile Ramase</th><th>Actiuni</th>';
                html += '</tr></thead><tbody>';
                
                dueSoonData.forEach(equipment => {
                    const serviceStatus = getServiceStatus(equipment.due_date_service);
                    html += `
                        <tr>
                            <td><span class="mono" style="font-weight: 600; color: var(--primary-green);">${equipment.barcode}</span></td>
                            <td><strong>${equipment.name}</strong></td>
                            <td><span class="badge">${equipment.type}</span></td>
                            <td>${equipment.location}${equipment.sub_location ? '<br><small class="text-muted">' + equipment.sub_location + '</small>' : ''}</td>
                            <td>${new Date(equipment.due_date_service).toLocaleDateString('ro-RO')}</td>
                            <td class="${serviceStatus.class}">${serviceStatus.days}</td>
                            <td>
                                <button onclick="viewEquipment('${equipment.id}')" class="btn" style="font-size: 12px; padding: 6px 12px; margin-right: 4px; background: var(--primary-green-dark); color: white; border: 2px solid transparent;"><i class="fas fa-eye"></i></button>
                                <button onclick="editEquipment('${equipment.id}')" class="btn btn-warning" style="font-size: 12px; padding: 6px 12px;"><i class="fas fa-edit"></i></button>
                            </td>
                        </tr>
                    `;
                });
                html += '</tbody></table></div>';
            } else {
                html += '<div class="alert alert-success"><i class="fas fa-check-circle" style="font-size: 1.25rem;"></i><div>Nu exista echipamente cu service programat in urmatoarele 30 de zile.</div></div>';
            }
            document.getElementById('main-content').innerHTML = html;
        });
}

// Show overdue equipment
function showOverdueEquipment() {
    document.getElementById('main-content').innerHTML = '<div class="loading">Se incarca echipamentele cu service intarziat...</div>';
    
    fetch('api.php?action=overdue')
        .then(response => response.json())
        .then(data => {
            let html = '<h3><i class="fas fa-exclamation-circle"></i> Echipamente cu Service Intarziat</h3>';
            if (data.length > 0) {
                html += '<div class="table-container"><table><thead><tr>';
                html += '<th>Barcode</th><th>Nume</th><th>Tip</th><th>Locatie</th><th>Data Service</th><th>Zile Intarziere</th><th>Actiuni</th>';
                html += '</tr></thead><tbody>';
                
                data.forEach(equipment => {
                    const serviceStatus = getServiceStatus(equipment.due_date_service);
                    html += `
                        <tr>
                            <td><span class="mono" style="font-weight: 600; color: var(--danger-red);">${equipment.barcode}</span></td>
                            <td><strong>${equipment.name}</strong></td>
                            <td><span class="badge">${equipment.type}</span></td>
                            <td>${equipment.location}${equipment.sub_location ? '<br><small class="text-muted">' + equipment.sub_location + '</small>' : ''}</td>
                            <td style="color: var(--danger-red);">${new Date(equipment.due_date_service).toLocaleDateString('ro-RO')}</td>
                            <td class="${serviceStatus.class}">${serviceStatus.days}</td>
                            <td>
                                <button onclick="viewEquipment('${equipment.id}')" class="btn" style="font-size: 12px; padding: 6px 12px; margin-right: 4px; background: var(--primary-green-dark); color: white; border: 2px solid transparent;"><i class="fas fa-eye"></i></button>
                                <button onclick="editEquipment('${equipment.id}')" class="btn btn-warning" style="font-size: 12px; padding: 6px 12px;"><i class="fas fa-edit"></i></button>
                            </td>
                        </tr>
                    `;
                });
                html += '</tbody></table></div>';
            } else {
                html += '<div class="alert alert-success"><i class="fas fa-check-circle" style="font-size: 1.25rem;"></i><div>Nu exista echipamente cu service intarziat.</div></div>';
            }
            document.getElementById('main-content').innerHTML = html;
        });
}

// Show equipment types
function showEquipmentTypes() {
    document.getElementById('main-content').innerHTML = '<div class="loading">Se incarca tipurile de echipamente...</div>';
    
    fetch('api.php?action=types_list')
        .then(response => response.json())
        .then(data => {
            let html = '<h3><i class="fas fa-th-large"></i> Tipuri de Echipamente</h3>';
            html += '<div class="types-grid">';
            
            data.forEach(type => {
                const cardClass = getTypeCardClass(type.type);
                html += `
                    <div class="type-card ${cardClass}" onclick="showEquipmentByType('${type.type}')">
                        <div class="type-name">${type.type}</div>
                        <div class="type-count">${type.count} echipamente</div>
                    </div>
                `;
            });
            
            html += '</div>';
            document.getElementById('main-content').innerHTML = html;
        });
}

// Show equipment filtered by type
function showEquipmentByType(type) {
    document.getElementById('main-content').innerHTML = '<div class="loading">Se incarca echipamentele de tip ' + type + '...</div>';
    
    fetch(`api.php?action=by_type&type=${encodeURIComponent(type)}`)
        .then(response => response.json())
        .then(data => {
            let html = `<h3><i class="fas fa-filter"></i> Echipamente de tip: ${type}</h3>`;
            if (data.length > 0) {
                html += '<div class="table-container"><table><thead><tr>';
                html += '<th>Barcode</th><th>Nume</th><th>Producator</th><th>Locatie</th><th>Status Service</th><th>Actiuni</th>';
                html += '</tr></thead><tbody>';
                
                data.forEach(equipment => {
                    const serviceStatus = getServiceStatus(equipment.due_date_service);
                    html += `
                        <tr>
                            <td><span class="mono" style="font-weight: 600; color: var(--primary-green);">${equipment.barcode}</span></td>
                            <td><strong>${equipment.name}</strong></td>
                            <td>${equipment.producer}</td>
                            <td>${equipment.location}${equipment.sub_location ? '<br><small class="text-muted">' + equipment.sub_location + '</small>' : ''}</td>
                            <td class="${serviceStatus.class}">${serviceStatus.text}</td>
                            <td>
                                <button onclick="viewEquipment('${equipment.id}')" class="btn" style="font-size: 12px; padding: 6px 12px; margin-right: 4px; background: var(--primary-green-dark); color: white; border: 2px solid transparent;"><i class="fas fa-eye"></i></button>
                                <button onclick="editEquipment('${equipment.id}')" class="btn btn-warning" style="font-size: 12px; padding: 6px 12px;"><i class="fas fa-edit"></i></button>
                            </td>
                        </tr>
                    `;
                });
                html += '</tbody></table></div>';
                html += '<button onclick="showEquipmentTypes()" class="btn btn-primary" style="margin-top: 20px;"><i class="fas fa-arrow-left"></i> Inapoi la Tipuri</button>';
            } else {
                html += '<div style="text-align: center; padding: 60px; color: var(--gray-500);"><i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 16px; display: block;"></i><p>Nu s-au gasit echipamente de acest tip.</p></div>';
            }
            document.getElementById('main-content').innerHTML = html;
        });
}

// Helper function to get icon for equipment type
function getTypeIcon(type) {
    const icons = {
        'Aparat Raze X': '<i class="fas fa-x-ray"></i>',
        'Ecograf': '<i class="fas fa-wave-square"></i>',
        'Monitor Pacient': '<i class="fas fa-heartbeat"></i>',
        'Defibrillator': '<i class="fas fa-bolt"></i>',
        'Pompa de Perfuzie': '<i class="fas fa-tint"></i>',
        'Scanner CT': '<i class="fas fa-circle-notch"></i>',
        'Scanner RMN': '<i class="fas fa-magnet"></i>',
        'Ventilator': '<i class="fas fa-wind"></i>',
        'Aparat Anestezie': '<i class="fas fa-lungs"></i>',
        'Altele': '<i class="fas fa-medkit"></i>'
    };
    return icons[type] || '<i class="fas fa-medical"></i>';
}

// Helper function to get card class for equipment type
function getTypeCardClass(type) {
    const classes = {
        'Aparat Raze X': 'type-xray',
        'Ecograf': 'type-ultrasound',
        'Monitor Pacient': 'type-monitor',
        'Defibrillator': 'type-defibrillator',
        'Scanner CT': 'type-ct',
        'Scanner RMN': 'type-mri',
        'Ventilator': 'type-ventilator'
    };
    return classes[type] || 'type-other';
}
