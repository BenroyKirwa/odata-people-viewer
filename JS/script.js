// script.js
let currentPage = 1;
const peoplePerPage = 5;
let peopleData = [];
let sortCriteria = [];
let filterCriteria = [];

// Column types and their valid relations for the OData API
const columnTypes = {
    UserName: 'string',
    FirstName: 'string',
    LastName: 'string',
    MiddleName: 'string',
    Gender: 'string',
    Age: 'number'
};

const relationsByType = {
    string: [
        { value: 'eq', label: 'Equals' },
        { value: 'contains', label: 'Contains' },
        { value: 'startswith', label: 'Starts With' },
        { value: 'endswith', label: 'Ends With' }
    ],
    number: [
        { value: 'eq', label: 'Equals' },
        { value: 'gt', label: 'Greater Than' },
        { value: 'lt', label: 'Less Than' }
    ]
};

// Read query parameters from the URL on page load
function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    const sortField = params.get('sortField') || '';
    const sortOrder = params.get('sortOrder') || 'asc';
    const filterField = params.get('filterField') || '';
    const filterValue = params.get('filterValue') || '';

    // Populate sortCriteria and filterCriteria based on URL parameters
    if (sortField && sortOrder) {
        sortCriteria = [{ id: Date.now(), column: sortField, order: sortOrder }];
    }
    if (filterField && filterValue) {
        const relation = columnTypes[filterField] === 'string' ? 'eq' : 'eq';
        filterCriteria = [{ id: Date.now(), column: filterField, relation, value: filterValue }];
    }
}

// Update the browser's URL with the first sorting and filtering parameters
function updateQueryParams() {
    const params = new URLSearchParams();
    if (sortCriteria.length > 0) {
        params.set('sortField', sortCriteria[0].column);
        params.set('sortOrder', sortCriteria[0].order);
    }
    if (filterCriteria.length > 0) {
        params.set('filterField', filterCriteria[0].column);
        params.set('filterValue', filterCriteria[0].value);
    }

    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.pushState({}, '', newUrl);
}

// Fetch people data with sorting and filtering
async function fetchPeopleData() {
    showLoader();
    peopleData = [];
    const baseUrl = 'https://cors-anywhere.herokuapp.com/http://services.odata.org/TripPinRESTierService/People';
    const pageSize = 10; // API default page size
    let skip = 0;
    let hasMore = true;

    // Build OData query parameters
    let queryParams = [];

    // Sorting: Use $orderby
    if (sortCriteria.length > 0) {
        const orderBy = sortCriteria.map(c => `${c.column} ${c.order}`).join(',');
        queryParams.push(`$orderby=${orderBy}`);
    }

    // Filtering: Use $filter
    if (filterCriteria.length > 0) {
        const filters = filterCriteria.map(criterion => {
            const { column, relation, value } = criterion;
            if (!value) return null;

            if (columnTypes[column] === 'string') {
                // String operations
                if (relation === 'eq') {
                    return `${column} eq '${value}'`;
                } else if (relation === 'contains') {
                    return `contains(${column}, '${value}')`;
                } else if (relation === 'startswith') {
                    return `startswith(${column}, '${value}')`;
                } else if (relation === 'endswith') {
                    return `endswith(${column}, '${value}')`;
                }
            } else if (columnTypes[column] === 'number') {
                // Number operations (e.g., Age)
                return `${column} ${relation} ${value}`;
            }
            return null;
        }).filter(f => f !== null);

        if (filters.length > 0) {
            queryParams.push(`$filter=${filters.join(' and ')}`);
        }
    }

    while (hasMore) {
        try {
            let url = `${baseUrl}?$skip=${skip}&$top=${pageSize}`;
            if (queryParams.length > 0) {
                url += `&${queryParams.join('&')}`;
            }
            console.log('Fetching URL:', url);
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Response status: ${response.status}`);
            const data = await response.json();
            const newPeople = data.value || [];
            peopleData.push(...newPeople);
            console.log(`Fetched ${newPeople.length} people, total: ${peopleData.length}`);

            // If we get fewer than pageSize records, we've reached the end
            if (newPeople.length < pageSize) {
                hasMore = false;
            } else {
                skip += pageSize;
            }
        } catch (error) {
            console.error('Error fetching people data:', error.message);
            hasMore = false;
        }
    }

    if (peopleData.length === 0) {
        console.error('No people data fetched');
    } else {
        currentPage = 1; // Reset to first page after fetching
        displayPeople(); // Render the data in the table
    }
    hideLoader();
}

// Display the people data in a table
function displayPeople() {
    const tableBody = document.getElementById('peopleTableBody');
    if (!tableBody) {
        console.error("Table body not found!");
        return;
    }
    tableBody.innerHTML = '';

    const totalPages = Math.ceil(peopleData.length / peoplePerPage);
    const startIndex = (currentPage - 1) * peoplePerPage;
    const endIndex = startIndex + peoplePerPage;
    const paginatedPeople = peopleData.slice(startIndex, endIndex);

    if (paginatedPeople.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="no-tickets">No people data available</td></tr>';
        return;
    }

    paginatedPeople.forEach((person, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${person.UserName}</td>
            <td>${person.FirstName}</td>
            <td>${person.LastName}</td>
            <td>${person.MiddleName || 'N/A'}</td>
            <td>${person.Gender}</td>
            <td>${person.Age || 'N/A'}</td>
        `;
        tableBody.appendChild(row);
    });

    // Add pagination controls
    const paginationDiv = document.createElement('div');
    paginationDiv.className = 'pagination';
    paginationDiv.innerHTML = `
        <button onclick="jumpToFirstPage()" ${currentPage === 1 ? 'disabled' : ''}>First</button>
        <button onclick="previousPage()" ${currentPage === 1 ? 'disabled' : ''}>Previous</button>
        <span>Page ${currentPage} of ${totalPages}</span>
        <button onclick="nextPage()" ${currentPage === totalPages ? 'disabled' : ''}>Next</button>
        <button onclick="jumpToLastPage()" ${currentPage === totalPages ? 'disabled' : ''}>Last</button>
    `;
    const existingPagination = document.querySelector('.pagination');
    if (existingPagination) existingPagination.replaceWith(paginationDiv);
    else document.querySelector('.table-container').appendChild(paginationDiv);

    // Update sort/filter button labels
    updateButtonLabels();
}

// Update sort and filter button labels
function updateButtonLabels() {
    const sortBtn = document.getElementById('sortBtn');
    const filterBtn = document.getElementById('filterBtn');

    if (sortCriteria.length > 0) {
        sortBtn.classList.add('sorted');
        sortBtn.querySelector('.sort-label').textContent = `${sortCriteria.length} Sort`;
        sortBtn.querySelector('.sort-image').style.display = 'none';
        sortBtn.querySelector('.close-sort').style.display = 'inline';
    } else {
        sortBtn.classList.remove('sorted');
        sortBtn.querySelector('.sort-label').textContent = 'Sort';
        sortBtn.querySelector('.sort-image').style.display = 'inline';
        sortBtn.querySelector('.close-sort').style.display = 'none';
    }

    if (filterCriteria.length > 0) {
        filterBtn.classList.add('filtered');
        filterBtn.querySelector('.filter-label').textContent = `${filterCriteria.length} Filter`;
        filterBtn.querySelector('.filter-image').style.display = 'none';
        filterBtn.querySelector('.close-filter').style.display = 'block';
    } else {
        filterBtn.classList.remove('filtered');
        filterBtn.querySelector('.filter-label').textContent = 'Filter';
        filterBtn.querySelector('.filter-image').style.display = 'inline';
        filterBtn.querySelector('.close-filter').style.display = 'none';
    }
}

// Pagination functions
function jumpToFirstPage() {
    currentPage = 1;
    displayPeople();
}

function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        displayPeople();
    }
}

function nextPage() {
    const totalPages = Math.ceil(peopleData.length / peoplePerPage);
    if (currentPage < totalPages) {
        currentPage++;
        displayPeople();
    }
}

function jumpToLastPage() {
    currentPage = Math.ceil(peopleData.length / peoplePerPage);
    displayPeople();
}

// Sort Popup Functions
window.showSortPopup = function () {
    const content = document.getElementsByClassName("popup-content")[0];
    content.innerHTML = `
        <div class="sort-popup">
            <div class="sort-popup-header">
                <div class="sort-header-start">
                    <img src="Images/sort.svg" alt="image" width="20" height="20">
                    <h2>Sort People</h2>
                </div>
                <img class="close" id="closePopup" src="Images/cancel.svg" alt="image" width="20" height="20">
            </div>
            <div class="sort-body">
                <div id="sortCriteriaList"></div>
                <button onclick="addSortCriteria()">Add Sort</button>
            </div>
            <div class="sort-popup-footer">
                <button id="resetBtn" onclick="resetSort()">Reset Sorting</button>
                <button id="submitBtn" onclick="applySort(); document.getElementById('popup').style.display = 'none';">Submit</button>
            </div>
        </div>
    `;
    document.getElementById("popup").style.display = "block";
    document.getElementById("closePopup").addEventListener("click", () => {
        document.getElementById("popup").style.display = "none";
    });

    // Populate existing sort criteria
    document.getElementById("sortCriteriaList").innerHTML = '';
    sortCriteria.forEach(criterion => {
        const criterionId = criterion.id;
        const div = document.createElement("div");
        div.classList.add("sort-criterion-list");
        div.dataset.id = criterionId;
        div.innerHTML = `
            <div>
                <p><b>Column</b></p>
                <select class="sort-column">
                    <option value="UserName" ${criterion.column === 'UserName' ? 'selected' : ''}>UserName</option>
                    <option value="FirstName" ${criterion.column === 'FirstName' ? 'selected' : ''}>FirstName</option>
                    <option value="LastName" ${criterion.column === 'LastName' ? 'selected' : ''}>LastName</option>
                    <option value="MiddleName" ${criterion.column === 'MiddleName' ? 'selected' : ''}>MiddleName</option>
                    <option value="Gender" ${criterion.column === 'Gender' ? 'selected' : ''}>Gender</option>
                    <option value="Age" ${criterion.column === 'Age' ? 'selected' : ''}>Age</option>
                </select>
            </div>
            <div>
                <p><b>Order</b></p>
                <select class="sort-order">
                    <option value="asc" ${criterion.order === 'asc' ? 'selected' : ''}>Ascending</option>
                    <option value="desc" ${criterion.order === 'desc' ? 'selected' : ''}>Descending</option>
                </select>
            </div>
            <button id="deleteBtn" class="delete-sort" onclick="deleteSortCriteria(${criterionId})">🗑️</button>
        `;
        document.getElementById("sortCriteriaList").appendChild(div);

        div.querySelector(".sort-column").addEventListener("change", (e) => {
            criterion.column = e.target.value;
        });
        div.querySelector(".sort-order").addEventListener("change", (e) => {
            criterion.order = e.target.value;
        });
    });
};

window.addSortCriteria = function () {
    const list = document.getElementById("sortCriteriaList");
    const criterionId = Date.now();
    const div = document.createElement("div");
    div.classList.add("sort-criterion-list");
    div.dataset.id = criterionId;
    div.innerHTML = `
        <div>
            <select class="sort-column">
                <option value="UserName">UserName</option>
                <option value="FirstName">FirstName</option>
                <option value="LastName">LastName</option>
                <option value="MiddleName">MiddleName</option>
                <option value="Gender">Gender</option>
                <option value="Age">Age</option>
            </select>
        </div>
        <div>
            <select class="sort-order">
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
            </select>
        </div>
        <button class="delete-sort" onclick="deleteSortCriteria(${criterionId})">🗑️</button>
    `;
    list.appendChild(div);
    sortCriteria.push({ id: criterionId, column: "UserName", order: "asc" });

    div.querySelector(".sort-column").addEventListener("change", (e) => {
        const criterion = sortCriteria.find(c => c.id === criterionId);
        criterion.column = e.target.value;
    });
    div.querySelector(".sort-order").addEventListener("change", (e) => {
        const criterion = sortCriteria.find(c => c.id === criterionId);
        criterion.order = e.target.value;
    });
};

window.deleteSortCriteria = function (id) {
    sortCriteria = sortCriteria.filter(c => c.id !== id);
    const criterionDiv = document.querySelector(`#sortCriteriaList div[data-id="${id}"]`);
    if (criterionDiv) criterionDiv.remove();
};

window.applySort = async function () {
    showLoader();
    updateQueryParams();
    await fetchPeopleData();
};

window.resetSort = async function () {
    showLoader();
    sortCriteria = [];
    updateQueryParams();
    await fetchPeopleData();
};

// Filter Popup Functions
window.showFilterPopup = function () {
    const content = document.getElementsByClassName("popup-content")[0];
    content.innerHTML = `
        <div class="filter-popup">
            <div class="filter-popup-header">
                <div class="filter-header-start">
                    <img src="Images/filter.svg" alt="image" width="20" height="20">
                    <h2>Filter People</h2>
                </div>
                <img class="close" id="closePopup" src="Images/cancel.svg" alt="image" width="20" height="20">
            </div>
            <div class="filter-popup-body">
                <div id="filterCriteriaList"></div>
                <button onclick="addFilterCriteria()">Add Filter</button>
            </div>
            <div class="filter-popup-footer">
                <button id="resetBtn" onclick="resetFilter()">Reset Filter</button>
                <button id="submitBtn" onclick="applyFilter(); document.getElementById('popup').style.display = 'none';">Submit</button>
            </div>
        </div>
    `;
    document.getElementById("popup").style.display = "block";
    document.getElementById("closePopup").addEventListener("click", () => {
        document.getElementById("popup").style.display = "none";
    });

    // Populate existing filter criteria
    document.getElementById("filterCriteriaList").innerHTML = '';
    filterCriteria.forEach(criterion => {
        const criterionId = criterion.id;
        const columnType = columnTypes[criterion.column];
        const relations = relationsByType[columnType];
        const div = document.createElement("div");
        div.dataset.id = criterionId;
        div.classList.add('filter-criterion');
        div.innerHTML = `
            <div>
                <p><b>Column:</b></p>
                <select class="filter-column">
                    <option value="UserName" ${criterion.column === 'UserName' ? 'selected' : ''}>UserName</option>
                    <option value="FirstName" ${criterion.column === 'FirstName' ? 'selected' : ''}>FirstName</option>
                    <option value="LastName" ${criterion.column === 'LastName' ? 'selected' : ''}>LastName</option>
                    <option value="MiddleName" ${criterion.column === 'MiddleName' ? 'selected' : ''}>MiddleName</option>
                    <option value="Gender" ${criterion.column === 'Gender' ? 'selected' : ''}>Gender</option>
                    <option value="Age" ${criterion.column === 'Age' ? 'selected' : ''}>Age</option>
                </select>
            </div>
            <div>
                <p><b>Relation:</b></p>
                <select class="filter-relation">
                    ${relations.map(rel => `<option value="${rel.value}" ${criterion.relation === rel.value ? 'selected' : ''}>${rel.label}</option>`).join('')}
                </select>
            </div>
            <div>
                <p><b>Filter value:</b></p>
                <input class="filter-value" type="text" value="${criterion.value}" placeholder="Enter a value">
            </div>
            <button id="deleteBtn" class="delete-filter" onclick="deleteFilterCriteria(${criterionId})">🗑️</button>
        `;
        document.getElementById("filterCriteriaList").appendChild(div);

        div.querySelector(".filter-column").addEventListener("change", (e) => {
            criterion.column = e.target.value;
            const newType = columnTypes[criterion.column] || 'string';
            const newRelations = relationsByType[newType];
            const relationSelect = div.querySelector(".filter-relation");
            relationSelect.innerHTML = newRelations.map(rel => `<option value="${rel.value}">${rel.label}</option>`).join('');
            criterion.relation = newRelations[0].value;
            criterion.value = '';
            div.querySelector(".filter-value").value = '';
        });
        div.querySelector(".filter-relation").addEventListener("change", (e) => {
            criterion.relation = e.target.value;
        });
        div.querySelector(".filter-value").addEventListener("input", (e) => {
            criterion.value = e.target.value;
        });
    });
};

window.addFilterCriteria = function () {
    const list = document.getElementById("filterCriteriaList");
    const criterionId = Date.now();
    const div = document.createElement("div");
    div.dataset.id = criterionId;
    div.classList.add('filter-criterion');
    const defaultColumn = 'UserName';
    const defaultType = columnTypes[defaultColumn];
    const defaultRelations = relationsByType[defaultType];
    div.innerHTML = `
        <select class="filter-column">
            <option value="UserName">UserName</option>
            <option value="FirstName">FirstName</option>
            <option value="LastName">LastName</option>
            <option value="MiddleName">MiddleName</option>
            <option value="Gender">Gender</option>
            <option value="Age">Age</option>
        </select>
        <select class="filter-relation">
            ${defaultRelations.map(rel => `<option value="${rel.value}">${rel.label}</option>`).join('')}
        </select>
        <input class="filter-value" type="text" placeholder="Enter a value">
        <button class="delete-filter" onclick="deleteFilterCriteria(${criterionId})">🗑️</button>
    `;
    list.appendChild(div);
    filterCriteria.push({ id: criterionId, column: defaultColumn, relation: defaultRelations[0].value, value: '' });

    div.querySelector(".filter-column").addEventListener("change", (e) => {
        const criterion = filterCriteria.find(c => c.id === criterionId);
        criterion.column = e.target.value;
        const newType = columnTypes[criterion.column] || 'string';
        const newRelations = relationsByType[newType];
        const relationSelect = div.querySelector(".filter-relation");
        relationSelect.innerHTML = newRelations.map(rel => `<option value="${rel.value}">${rel.label}</option>`).join('');
        criterion.relation = newRelations[0].value;
        criterion.value = '';
        div.querySelector(".filter-value").value = '';
    });
    div.querySelector(".filter-relation").addEventListener("change", (e) => {
        const criterion = filterCriteria.find(c => c.id === criterionId);
        criterion.relation = e.target.value;
    });
    div.querySelector(".filter-value").addEventListener("input", (e) => {
        const criterion = filterCriteria.find(c => c.id === criterionId);
        criterion.value = e.target.value;
    });
};

window.deleteFilterCriteria = function (id) {
    filterCriteria = filterCriteria.filter(c => c.id !== id);
    const criterionDiv = document.querySelector(`#filterCriteriaList div[data-id="${id}"]`);
    if (criterionDiv) criterionDiv.remove();
};

window.applyFilter = async function () {
    showLoader();
    updateQueryParams();
    await fetchPeopleData();
};

window.resetFilter = async function () {
    showLoader();
    filterCriteria = [];
    updateQueryParams();
    await fetchPeopleData();
};

// Refresh function to reset sorting, filtering, and re-fetch data
window.refreshData = async function () {
    showLoader();
    sortCriteria = [];
    filterCriteria = [];
    updateQueryParams();
    await fetchPeopleData();
};

// Page loader
window.addEventListener("load", () => {
    setTimeout(() => {
        const loader = document.querySelector(".loader");
        loader.classList.add("loader-hidden");
        loader.addEventListener("transitioned", () => {
            document.removeChild("loader");
        })
    }, 2000);
})

// Loader Helper Functions
function showLoader() {
    const loader = document.querySelector(".loader");
    if (loader) {
        loader.classList.remove("loader-hidden");
    }
}

function hideLoader() {
    const loader = document.querySelector(".loader");
    if (loader) {
        loader.classList.add("loader-hidden");
    }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', async function () {
    showLoader();
    document.getElementById('sortBtn').addEventListener('click', showSortPopup);
    document.getElementById('filterBtn').addEventListener('click', showFilterPopup);
    document.getElementById('closeSortBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        resetSort();
    });
    document.getElementById('closeFilterBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        resetFilter();
    });
    document.getElementById('refreshBtn').addEventListener('click', refreshData);
    getQueryParams();
    await fetchPeopleData();
});