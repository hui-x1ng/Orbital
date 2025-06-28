const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
const sidebarContainer = document.getElementById('sidebarContainer');
const overlay = document.getElementById('overlay');
const mainContainer = document.getElementById('mainContainer');

export function setUpSidebar() {

    mainContainer.classList.remove('hidden');
    toggleSidebarBtn.classList.remove('hidden');
    sidebarContainer.classList.remove('hidden');

    toggleSidebarBtn.addEventListener('click', () => {
        const isActive = sidebarContainer.classList.contains('active');
        
        if (isActive) {
            sidebarContainer.classList.remove('active');
            toggleSidebarBtn.classList.remove('moved');
            overlay.classList.remove('active');
            mainContainer.classList.remove('shifted');
        } else {
            sidebarContainer.classList.add('active');
            toggleSidebarBtn.classList.add('moved');
            overlay.classList.add('active');
            mainContainer.classList.add('shifted');
        }
    });

    document.querySelectorAll('#sidebar button[data-page]').forEach(button => {
        button.addEventListener('click', async (e) => {
            const page = e.target.getAttribute('data-page');
            console.log(page);
            
            try {
                const mainContent = document.querySelector('#mainContainer') || mainContainer;
                let response = await fetch(`pages/${page}.html`);
                if (!response.ok) {
                    throw new Error(`Failed to load ${page}.html`);
                }
                const html = await response.text();
                // console.log(html);
                mainContent.innerHTML = html;
                const scriptModule = await import(`../script/${page}.js`);
                if (scriptModule.main) {
                    await new Promise(requestAnimationFrame);
                    await scriptModule.main(); //always run the script
                }

            } catch (error) {
                console.error('Failed to load page:', error);
            } finally {
                closeSidebar();
            }
        });
    });
} 

function closeSidebar() {
    sidebarContainer.classList.remove('active');
    toggleSidebarBtn.classList.remove('moved');
    overlay.classList.remove('active');
    mainContainer.classList.remove('shifted');
}