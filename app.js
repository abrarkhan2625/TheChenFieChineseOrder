/* =========================================================
   THE CHEN FIE CHINESE
   CUSTOMER WEBSITE
   MENU + PORTIONS + CART + ORDER FLOW
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    const $ = (id) => document.getElementById(id);

    const CART_STORAGE_KEY = "chenFieCart";
    const CART_EXPIRY_KEY = "chenFieCartExpiresAt";
    const CART_LIFETIME_MS = 24 * 60 * 60 * 1000;
    let cartExpiryTimer = null;

    function loadCart() {

        const expiresAt = Number(
            localStorage.getItem(CART_EXPIRY_KEY)
        );

        if (expiresAt && Date.now() >= expiresAt) {

            localStorage.removeItem(CART_STORAGE_KEY);
            localStorage.removeItem(CART_EXPIRY_KEY);

            return [];
        }

        try {

            const savedCart = JSON.parse(
                localStorage.getItem(CART_STORAGE_KEY) || "[]"
            );

            if (!Array.isArray(savedCart)) {
                return [];
            }

            /* Start the 24-hour timer for carts saved before this update. */
            if (savedCart.length && !expiresAt) {
                localStorage.setItem(
                    CART_EXPIRY_KEY,
                    String(Date.now() + CART_LIFETIME_MS)
                );
            }

            return savedCart;

        } catch {

            localStorage.removeItem(CART_STORAGE_KEY);
            localStorage.removeItem(CART_EXPIRY_KEY);

            return [];
        }
    }


    let cart = loadCart();

    /* =====================================================
       ELEMENTS
       ===================================================== */

    const cartPanel = $("cart");
    const cartOverlay = $("cart-overlay");
    const cartItems = $("cart-items");
    const cartTotal = $("cart-total");
    const cartCount = $("cart-count");
    const cartButton = $("cart-button");
    const cartClose = document.querySelector(".cart-close-button");
    const checkoutButton = $("checkout-button");

    const optionModal = $("menu-option-modal");
    const optionContent = $("menu-option-content");
    const optionTitle = $("menu-option-title");
    const optionAdd = $("menu-option-add");

    const orderSection = $("order-section");
    const orderSummary = $("order-summary");
    const orderForm = $("order-form");
    const summaryItems = $("summary-items");
    const summaryTotal = $("summary-total");
    const placeOrderButton = $("place-order-button");

    const mobileMenuButton =
        document.querySelector(".mobile-menu-button");

    const mainNavigation =
        document.querySelector(".main-navigation");

    const mobileCartButton =
        document.querySelector("#mobile-cart-button");

    const mobileCartCount =
        document.querySelector("#mobile-cart-count");

    const lightbox = $("image-lightbox");
    const lightboxImage = $("lightbox-image");
    const heroImage =
        document.querySelector(".hero-image img");

    let pendingItem = null;


    /* =====================================================
       HELPERS
       ===================================================== */

    function money(value) {
        return `₹${Number(value || 0).toFixed(0)}`;
    }


    function escapeHTML(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    function saveCart() {

        if (!cart.length) {

            localStorage.removeItem(CART_STORAGE_KEY);
            localStorage.removeItem(CART_EXPIRY_KEY);
            scheduleCartExpiry();

            return;
        }

        localStorage.setItem(
            CART_STORAGE_KEY,
            JSON.stringify(cart)
        );

        /* Each cart change gives the customer another 24 hours to order. */
        localStorage.setItem(
            CART_EXPIRY_KEY,
            String(Date.now() + CART_LIFETIME_MS)
        );

        scheduleCartExpiry();
    }


    function clearCart() {

        cart = [];
        saveCart();
        updateCart();
    }


    function scheduleCartExpiry() {

        if (cartExpiryTimer) {
            window.clearTimeout(cartExpiryTimer);
        }

        if (!cart.length) {
            return;
        }

        const expiresAt = Number(
            localStorage.getItem(CART_EXPIRY_KEY)
        );

        const delay = Math.max(
            expiresAt - Date.now(),
            0
        );

        cartExpiryTimer = window.setTimeout(
            () => {

                if (Date.now() >= expiresAt) {
                    clearCart();
                }

            },
            delay
        );
    }


    function getName(card) {
        return (
            card.querySelector("h4")?.textContent.trim() ||
            "Item"
        );
    }


    /* =====================================================
       PRICE READING
       ===================================================== */

    function getSinglePrice(card) {

        const text =
            card.querySelector(".menu-price")?.textContent || "";

        const match =
            text.match(/₹\s*(\d+)/);

        return match
            ? Number(match[1])
            : 0;
    }


    function getTwoPrices(card) {

        const text =
            card.querySelector(".menu-price")?.textContent || "";

        return [
            ...text.matchAll(/₹\s*(\d+)/g)
        ].map((match) => Number(match[1]));
    }


    /* =====================================================
       EXPLICIT VARIANT PRICES
       
       IMPORTANT:
       Uses data-type="veg"
       Uses data-type="nonveg"

       Never determines type by searching text for "Veg".
       ===================================================== */

    function getVariantPrices(card) {

        const result = {

            vegHalf: null,
            vegFull: null,

            nonvegHalf: null,
            nonvegFull: null,

            vegStandard: null,
            nonvegStandard: null
        };


        card
            .querySelectorAll(".portion-options span")
            .forEach((span) => {

                const type =
                    span.dataset.type || "";

                const portion =
                    span.dataset.portion || "";

                const match =
                    span.textContent.match(/₹\s*(\d+)/);

                if (!match) {
                    return;
                }

                const price =
                    Number(match[1]);


                if (
                    type === "veg" &&
                    portion === "half"
                ) {
                    result.vegHalf = price;
                }


                if (
                    type === "veg" &&
                    portion === "full"
                ) {
                    result.vegFull = price;
                }


                if (
                    type === "nonveg" &&
                    portion === "half"
                ) {
                    result.nonvegHalf = price;
                }


                if (
                    type === "nonveg" &&
                    portion === "full"
                ) {
                    result.nonvegFull = price;
                }


                if (
                    type === "veg" &&
                    portion === "standard"
                ) {
                    result.vegStandard = price;
                }


                if (
                    type === "nonveg" &&
                    portion === "standard"
                ) {
                    result.nonvegStandard = price;
                }

            });


        return result;
    }


    /* =====================================================
       CART TOTAL
       ===================================================== */

    function getCartTotal() {

        return cart.reduce(
            (sum, item) =>
                sum +
                Number(item.price) *
                Number(item.quantity),
            0
        );
    }


    function getCartCount() {

        return cart.reduce(
            (sum, item) =>
                sum + Number(item.quantity),
            0
        );
    }


    /* =====================================================
       UPDATE CART
       ===================================================== */

    function updateCart() {

        const count =
            getCartCount();


        if (cartCount) {
            cartCount.textContent = count;
        }


        if (mobileCartCount) {
            mobileCartCount.textContent = count;
        }


        if (cartTotal) {
            cartTotal.textContent =
                money(getCartTotal());
        }


        if (checkoutButton) {
            checkoutButton.disabled =
                cart.length === 0;
        }


        if (!cartItems) {
            return;
        }


        if (!cart.length) {

            cartItems.innerHTML = `
                <p class="empty-cart-message">
                    Your cart is empty.
                </p>
            `;

            return;
        }


        cartItems.innerHTML = cart
            .map((item, index) => {

                const lineTotal =
                    Number(item.price) *
                    Number(item.quantity);


                /* Beverages have no VEG/NV label */

                const badge =
                    item.category === "beverages"
                        ? ""
                        : item.type
                            ? `
                                <span class="cart-food-type ${
                                    item.type === "veg"
                                        ? "cart-veg"
                                        : "cart-nonveg"
                                }">
                                    ${
                                        item.type === "veg"
                                            ? "VEG"
                                            : "NV"
                                    }
                                </span>
                            `
                            : "";


                const portion =
                    item.portion
                        ? `
                            <span>
                                ${escapeHTML(item.portion)}
                            </span>
                        `
                        : "";


                return `
                    <div class="cart-item">

                        <div class="cart-item-info">

                            <div class="cart-item-title">
                                ${escapeHTML(item.name)}
                            </div>

                            <div class="cart-item-details">
                                ${badge}
                                ${portion}
                            </div>

                            <div class="cart-item-price">
                                ${money(item.price)} each
                            </div>

                        </div>


                        <div class="cart-item-actions">

                            <div class="quantity-control">

                                <button
                                    type="button"
                                    data-cart-action="decrease"
                                    data-index="${index}"
                                    aria-label="Decrease quantity"
                                >
                                    −
                                </button>

                                <span>
                                    ${item.quantity}
                                </span>

                                <button
                                    type="button"
                                    data-cart-action="increase"
                                    data-index="${index}"
                                    aria-label="Increase quantity"
                                >
                                    +
                                </button>

                            </div>


                            <strong class="cart-item-total">
                                ${money(lineTotal)}
                            </strong>


                            <button
                                type="button"
                                class="remove-item-button"
                                data-cart-action="remove"
                                data-index="${index}"
                            >
                                Remove
                            </button>

                        </div>

                    </div>
                `;

            })
            .join("");
    }


    /* =====================================================
       OPEN / CLOSE CART
       ===================================================== */

    function openCart() {

        if (!cartPanel) {
            return;
        }

        cartPanel.classList.add("is-open");

        cartOverlay?.classList.add(
            "is-visible"
        );

        cartPanel.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.classList.add(
            "cart-open"
        );
    }


    function closeCart() {

        if (!cartPanel) {
            return;
        }

        cartPanel.classList.remove(
            "is-open"
        );

        cartOverlay?.classList.remove(
            "is-visible"
        );

        cartPanel.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.classList.remove(
            "cart-open"
        );
    }


    cartButton?.addEventListener(
        "click",
        openCart
    );


    cartClose?.addEventListener(
        "click",
        closeCart
    );


    cartOverlay?.addEventListener(
        "click",
        closeCart
    );


    /* Mobile Cart button */

    mobileCartButton?.addEventListener(
        "click",
        () => {

            openCart();


            if (mainNavigation) {
                mainNavigation.classList.remove(
                    "is-open"
                );
            }


            if (mobileMenuButton) {
                mobileMenuButton.setAttribute(
                    "aria-expanded",
                    "false"
                );

                mobileMenuButton.setAttribute(
                    "aria-label",
                    "Open navigation menu"
                );

                mobileMenuButton.textContent =
                    "☰";
            }

        }
    );


    /* =====================================================
       CART QUANTITY BUTTONS
       ===================================================== */

    cartItems?.addEventListener(
        "click",
        (event) => {

            const button =
                event.target.closest(
                    "[data-cart-action]"
                );


            if (!button) {
                return;
            }


            const index =
                Number(button.dataset.index);


            const action =
                button.dataset.cartAction;


            if (!cart[index]) {
                return;
            }


            if (action === "increase") {
                cart[index].quantity += 1;
            }


            if (action === "decrease") {

                cart[index].quantity -= 1;

                if (
                    cart[index].quantity <= 0
                ) {
                    cart.splice(index, 1);
                }
            }


            if (action === "remove") {
                cart.splice(index, 1);
            }


            saveCart();
            updateCart();


            if (
                orderSummary &&
                !orderSummary.hidden
            ) {
                renderOrderSummary();
            }

        }
    );


    /* =====================================================
       ADD ITEM TO CART
       ===================================================== */

    function addItem(item) {

        const existing =
            cart.find((existingItem) =>

                existingItem.name === item.name &&

                existingItem.type === item.type &&

                existingItem.portion === item.portion &&

                Number(existingItem.price) ===
                Number(item.price)

            );


        if (existing) {

            existing.quantity += 1;

        } else {

            cart.push({
                ...item,
                quantity: 1
            });

        }


        saveCart();
        updateCart();

        /* IMPORTANT:
           Do NOT automatically open the cart.
        */
    }


    /* =====================================================
       MENU OPTION MODAL
       ===================================================== */

    function closeOptionModal() {

        if (!optionModal) {
            return;
        }

        optionModal.hidden = true;

        document.body.classList.remove(
            "modal-open"
        );

        pendingItem = null;
    }


    function showOptionModal(card) {

        if (
            !optionModal ||
            !optionContent ||
            !optionTitle
        ) {
            return;
        }


        const name =
            getName(card);


        const category =
            card.dataset.category || "";


        const fixedType =
            card.dataset.type || "";


        const prices =
            getTwoPrices(card);


        const variantPrices =
            getVariantPrices(card);


        pendingItem = {
            name,
            category,
            fixedType,
            prices,
            variantPrices
        };


        optionTitle.textContent =
            name;


        let html = `
            <p class="option-description">
                Choose the options for
                <strong>
                    ${escapeHTML(name)}
                </strong>.
            </p>
        `;


        /* =================================================
           RICE + NOODLES
           ================================================= */

        if (
            category === "rice" ||
            category === "noodles"
        ) {

            html += `
                <div class="option-group">

                    <label for="type-select">
                        Type
                    </label>

                    <select id="type-select">

                        <option value="veg">
                            Veg
                        </option>

                        <option value="nonveg">
                            Non-Veg
                        </option>

                    </select>

                </div>


                <div class="option-group">

                    <label for="portion-select">
                        Portion
                    </label>

                    <select id="portion-select">

                        <option value="half">
                            Half
                        </option>

                        <option value="full">
                            Full
                        </option>

                    </select>

                </div>


                <p
                    id="option-price-preview"
                    class="selected-option"
                ></p>
            `;
        }


        /* =================================================
           SOUPS
           ================================================= */

        else if (
            category === "soups"
        ) {

            html += `
                <div class="option-group">

                    <label for="type-select">
                        Type
                    </label>

                    <select id="type-select">

                        <option value="veg">
                            Veg
                        </option>

                        <option value="nonveg">
                            Non-Veg
                        </option>

                    </select>

                </div>


                <p
                    id="option-price-preview"
                    class="selected-option"
                ></p>
            `;
        }


        /* =================================================
           OTHER HALF / FULL ITEMS
           ================================================= */

        else if (fixedType) {

            if (prices.length >= 2) {

                html += `
                    <div class="option-group">

                        <label for="portion-select">
                            Portion
                        </label>

                        <select id="portion-select">

                            <option value="half">
                                Half — ${money(prices[0])}
                            </option>

                            <option value="full">
                                Full — ${money(prices[1])}
                            </option>

                        </select>

                    </div>


                    <p
                        id="option-price-preview"
                        class="selected-option"
                    ></p>
                `;

            } else {

                html += `
                    <p class="selected-option">
                        ${
                            fixedType === "veg"
                                ? "VEG"
                                : "NV"
                        }
                        ·
                        ${money(
                            prices[0] ||
                            getSinglePrice(card)
                        )}
                    </p>
                `;
            }
        }


        optionContent.innerHTML =
            html;


        const typeSelect =
            $("type-select");


        const portionSelect =
            $("portion-select");


        /* =================================================
           UPDATE MODAL PRICE
           ================================================= */

        function refreshOptionPrice() {

            const preview =
                $("option-price-preview");


            if (!preview) {
                return;
            }


            let price = 0;


            /* RICE / NOODLES */

            if (
                category === "rice" ||
                category === "noodles"
            ) {

                const type =
                    typeSelect?.value ||
                    "veg";


                const portion =
                    portionSelect?.value ||
                    "half";


                if (type === "veg") {

                    price =
                        portion === "half"
                            ? variantPrices.vegHalf
                            : variantPrices.vegFull;

                } else {

                    price =
                        portion === "half"
                            ? variantPrices.nonvegHalf
                            : variantPrices.nonvegFull;
                }


                preview.textContent =
                    price
                        ? `Selected price: ${money(price)}`
                        : "Price unavailable.";
            }


            /* SOUPS */

            else if (
                category === "soups"
            ) {

                const type =
                    typeSelect?.value ||
                    "veg";


                price =
                    type === "veg"
                        ? variantPrices.vegStandard
                        : variantPrices.nonvegStandard;


                preview.textContent =
                    price
                        ? `Selected price: ${money(price)}`
                        : "Price unavailable.";
            }


            /* OTHER HALF / FULL ITEMS */

            else if (
                fixedType &&
                prices.length >= 2
            ) {

                const portion =
                    portionSelect?.value ||
                    "half";


                price =
                    portion === "half"
                        ? prices[0]
                        : prices[1];


                preview.textContent =
                    `Selected price: ${money(price)}`;
            }
        }


        typeSelect?.addEventListener(
            "change",
            refreshOptionPrice
        );


        portionSelect?.addEventListener(
            "change",
            refreshOptionPrice
        );


        refreshOptionPrice();


        optionModal.hidden = false;

        document.body.classList.add(
            "modal-open"
        );
    }


    /* =====================================================
       ADD BUTTONS
       ===================================================== */

    document
        .querySelectorAll(".add-button")
        .forEach((button) => {

            button.addEventListener(
                "click",
                () => {

                    const card =
                        button.closest(
                            ".menu-card"
                        );


                    if (!card) {
                        return;
                    }


                    const category =
                        card.dataset.category || "";


                    const type =
                        card.dataset.type || "";


                    const prices =
                        getTwoPrices(card);


                    const variantPrices =
                        getVariantPrices(card);


                    /* Rice / Noodles have explicit variants */

                    const hasRiceNoodleVariants =
                        category === "rice" ||
                        category === "noodles"
                            ? (
                                variantPrices.vegHalf !== null ||
                                variantPrices.vegFull !== null ||
                                variantPrices.nonvegHalf !== null ||
                                variantPrices.nonvegFull !== null
                            )
                            : false;


                    /* Soups have explicit variants */

                    const hasSoupVariants =
                        category === "soups" &&
                        (
                            variantPrices.vegStandard !== null ||
                            variantPrices.nonvegStandard !== null
                        );


                    const needsOptions =
                        hasRiceNoodleVariants ||
                        hasSoupVariants ||
                        prices.length >= 2;


                    if (needsOptions) {

                        showOptionModal(card);

                        return;
                    }


                    const price =
                        getSinglePrice(card);


                    if (!price) {

                        alert(
                            "This item's price could not be read."
                        );

                        return;
                    }


                    addItem({
                        name: getName(card),
                        type,
                        category,
                        portion: "",
                        price
                    });

                }
            );

        });


    /* =====================================================
       OPTION MODAL ADD BUTTON
       ===================================================== */

    optionAdd?.addEventListener(
        "click",
        () => {

            if (!pendingItem) {
                return;
            }


            const {
                name,
                category,
                fixedType,
                prices,
                variantPrices
            } = pendingItem;


            const type =
                fixedType ||
                $("type-select")?.value ||
                "";


            const portion =
                $("portion-select")?.value ||
                "";


            let price = 0;


            /* RICE / NOODLES */

            if (
                category === "rice" ||
                category === "noodles"
            ) {

                if (type === "veg") {

                    price =
                        portion === "half"
                            ? variantPrices.vegHalf
                            : variantPrices.vegFull;

                } else {

                    price =
                        portion === "half"
                            ? variantPrices.nonvegHalf
                            : variantPrices.nonvegFull;
                }
            }


            /* SOUPS */

            else if (
                category === "soups"
            ) {

                price =
                    type === "veg"
                        ? variantPrices.vegStandard
                        : variantPrices.nonvegStandard;
            }


            /* OTHER HALF / FULL ITEMS */

            else if (fixedType) {

                price =
                    portion === "half"
                        ? prices[0]
                        : (
                            prices[1] ||
                            prices[0]
                        );
            }


            if (!price) {

                alert(
                    "This item's price could not be read. Please check the menu price."
                );

                return;
            }


            addItem({

                name,
                type,
                category,

                portion:
                    portion === "half"
                        ? "Half"
                        : portion === "full"
                            ? "Full"
                            : "",

                price
            });


            closeOptionModal();
        }
    );


    /* =====================================================
       CLOSE OPTION MODAL
       ===================================================== */

    document
        .querySelectorAll(
            "[data-close-menu-modal]"
        )
        .forEach((element) => {

            element.addEventListener(
                "click",
                closeOptionModal
            );

        });


    /* =====================================================
       ORDER TYPE
       ===================================================== */

    function selectedOrderType() {

        return document.querySelector(
            'input[name="orderType"]:checked'
        )?.value || "";
    }


    function updateOrderTypeFields() {

        const type =
            selectedOrderType();


        const dineIn =
            $("dine-in-details");


        const pickup =
            $("pickup-details");


        const delivery =
            $("delivery-details");


        if (dineIn) {
            dineIn.hidden =
                type !== "dine-in";
        }


        if (pickup) {
            pickup.hidden =
                type !== "pickup";
        }


        if (delivery) {
            delivery.hidden =
                type !== "delivery";
        }
    }


    document
        .querySelectorAll(
            'input[name="orderType"]'
        )
        .forEach((radio) => {

            radio.addEventListener(
                "change",
                updateOrderTypeFields
            );

        });


    /* =====================================================
       CUSTOMER DETAILS
       ===================================================== */

    function getOrderCustomerDetails() {

        const type =
            selectedOrderType();


        if (type === "dine-in") {

            return {
                table:
                    $("table-number")
                        ?.value
                        .trim() || ""
            };
        }


        if (type === "pickup") {

            return {
                name:
                    $("pickup-name")
                        ?.value
                        .trim() || ""
            };
        }


        if (type === "delivery") {

            return {

                name:
                    $("delivery-name")
                        ?.value
                        .trim() || "",

                phone:
                    $("delivery-phone")
                        ?.value
                        .trim() || "",

                address:
                    $("delivery-address")
                        ?.value
                        .trim() || ""
            };
        }


        return {};
    }


    /* =====================================================
       ORDER SUMMARY
       ===================================================== */

    function renderOrderSummary() {

        if (
            !summaryItems ||
            !summaryTotal
        ) {
            return;
        }


        if (!cart.length) {

            summaryItems.innerHTML = `
                <p class="empty-cart-message">
                    Your cart is empty.
                    Please add an item first.
                </p>
            `;

            summaryTotal.textContent =
                money(0);

            return;
        }


        summaryItems.innerHTML =
            cart
                .map((item) => {

                    const typeText =
                        item.category === "beverages"
                            ? ""
                            : item.type
                                ? ` · ${
                                    item.type === "veg"
                                        ? "VEG"
                                        : "NV"
                                }`
                                : "";


                    const portionText =
                        item.portion
                            ? ` · ${escapeHTML(item.portion)}`
                            : "";


                    return `
                        <div class="summary-item">

                            <span>

                                <strong>
                                    ${escapeHTML(item.name)}
                                </strong>

                                ${typeText}

                                ${portionText}

                                × ${item.quantity}

                            </span>


                            <strong>
                                ${money(
                                    Number(item.price) *
                                    Number(item.quantity)
                                )}
                            </strong>

                        </div>
                    `;

                })
                .join("");


        summaryTotal.textContent =
            money(getCartTotal());
    }


    /* =====================================================
       CHECKOUT
       ===================================================== */

    checkoutButton?.addEventListener(
        "click",
        () => {

            if (!cart.length) {
                return;
            }


            closeCart();


            if (orderSection) {
                orderSection.hidden = false;
            }


            if (orderSummary) {
                orderSummary.hidden = true;
            }


            orderSection?.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

        }
    );


    /* =====================================================
       ORDER FORM SUBMIT
       ===================================================== */

    orderForm?.addEventListener(
        "submit",
        (event) => {

            event.preventDefault();


            if (!cart.length) {

                openCart();

                return;
            }


            const type =
                selectedOrderType();


            if (!type) {

                alert(
                    "Please select Dine In, Pickup or Delivery."
                );

                return;
            }


            /* DINE IN */

            if (
                type === "dine-in" &&
                !$("table-number")
                    ?.value
                    .trim()
            ) {

                alert(
                    "Please enter your table number."
                );

                $("table-number")?.focus();

                return;
            }


            /* PICKUP */

            if (
                type === "pickup" &&
                !$("pickup-name")
                    ?.value
                    .trim()
            ) {

                alert(
                    "Please enter your name."
                );

                $("pickup-name")?.focus();

                return;
            }


            /* DELIVERY */

            if (type === "delivery") {

                const name =
                    $("delivery-name")
                        ?.value
                        .trim() || "";


                const phone =
                    $("delivery-phone")
                        ?.value
                        .trim() || "";


                const address =
                    $("delivery-address")
                        ?.value
                        .trim() || "";


                const cleanPhone =
                    phone.replace(
                        /[\s-]/g,
                        ""
                    );


                const validIndianPhone =
                    /^(?:\+91|91)?[6-9]\d{9}$/
                        .test(cleanPhone);


                if (
                    !name ||
                    !phone ||
                    !address
                ) {

                    alert(
                        "Please complete your delivery name, phone number and address."
                    );

                    return;
                }


                if (!validIndianPhone) {

                    alert(
                        "Please enter a valid 10-digit Indian mobile number."
                    );

                    $("delivery-phone")?.focus();

                    return;
                }
            }


            renderOrderSummary();


            if (orderSummary) {
                orderSummary.hidden = false;
            }


            orderSummary?.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

        }
    );


    /* =====================================================
       PLACE ORDER -> WHATSAPP
       ===================================================== */

    placeOrderButton?.addEventListener(
        "click",
        () => {

            if (!cart.length) {

                alert(
                    "Your cart is empty."
                );

                return;
            }


            const type =
                selectedOrderType();


            if (!type) {

                alert(
                    "Please select an order type."
                );

                return;
            }


            const details =
                getOrderCustomerDetails();


            /* Validate details again */

            if (
                type === "dine-in" &&
                !details.table
            ) {

                alert(
                    "Please enter your table number."
                );

                $("table-number")?.focus();

                return;
            }


            if (
                type === "pickup" &&
                !details.name
            ) {

                alert(
                    "Please enter your name."
                );

                $("pickup-name")?.focus();

                return;
            }


            if (type === "delivery") {

                const cleanPhone =
                    details.phone.replace(
                        /[\s-]/g,
                        ""
                    );


                const validIndianPhone =
                    /^(?:\+91|91)?[6-9]\d{9}$/
                        .test(cleanPhone);


                if (
                    !details.name ||
                    !details.phone ||
                    !details.address
                ) {

                    alert(
                        "Please complete your delivery name, phone number and address."
                    );

                    return;
                }


                if (!validIndianPhone) {

                    alert(
                        "Please enter a valid 10-digit Indian mobile number."
                    );

                    $("delivery-phone")?.focus();

                    return;
                }
            }


            const typeLabel = {

                "dine-in":
                    "Dine In",

                "pickup":
                    "Pickup",

                "delivery":
                    "Delivery"

            }[type];


            /* =================================================
               ORDER ITEMS
               ================================================= */

            const lines =
                cart.map((item) => {

                    const variant = [

                        item.category === "beverages"
                            ? ""
                            : item.type === "veg"
                                ? "VEG"
                                : item.type === "nonveg"
                                    ? "NV"
                                    : "",

                        item.portion || ""

                    ]
                        .filter(Boolean)
                        .join(" / ");


                    return [

                        `• ${item.name}`,

                        variant
                            ? `(${variant})`
                            : "",

                        `x${item.quantity}`,

                        `= ${money(
                            Number(item.price) *
                            Number(item.quantity)
                        )}`

                    ]
                        .filter(Boolean)
                        .join(" ");

                });


            /* =================================================
               CUSTOMER INFORMATION
               ================================================= */

            const customerLines = [];


            if (type === "dine-in") {

                customerLines.push(
                    `Table Number: ${details.table}`
                );
            }


            if (type === "pickup") {

                customerLines.push(
                    `Customer Name: ${details.name}`
                );
            }


            if (type === "delivery") {

                customerLines.push(
                    `Customer Name: ${details.name}`,
                    `Phone: ${details.phone}`,
                    `Address: ${details.address}`
                );
            }


            /* =================================================
               WHATSAPP MESSAGE
               ================================================= */

            const message = [

                "Hello The Chen Fie Chinese, I would like to place an order.",

                "",

                `Order Type: ${typeLabel}`,

                ...customerLines,

                "",

                "ORDER ITEMS:",

                ...lines,

                "",

                `TOTAL: ${money(
                    getCartTotal()
                )}`

            ].join("\n");


            const whatsappWindow = window.open(
                `https://wa.me/917709018122?text=${encodeURIComponent(
                    message
                )}`,
                "_blank"
            );


            if (!whatsappWindow) {

                alert(
                    "WhatsApp could not be opened. Please allow pop-ups and try again."
                );

                return;
            }


            whatsappWindow.opener = null;

            /* The order has been handed off to WhatsApp, so begin a fresh cart. */
            clearCart();


            if (orderSummary) {
                orderSummary.hidden = true;
            }


            orderForm?.reset();
            updateOrderTypeFields();

        }
    );


    /* =====================================================
       MOBILE NAVIGATION
       ===================================================== */

    mobileMenuButton?.addEventListener(
        "click",
        () => {

            if (!mainNavigation) {
                return;
            }


            const isOpen =
                mainNavigation.classList.toggle(
                    "is-open"
                );


            mobileMenuButton.setAttribute(
                "aria-expanded",
                String(isOpen)
            );


            mobileMenuButton.setAttribute(
                "aria-label",
                isOpen
                    ? "Close navigation menu"
                    : "Open navigation menu"
            );


            mobileMenuButton.textContent =
                isOpen
                    ? "×"
                    : "☰";

        }
    );


    mainNavigation
        ?.querySelectorAll("a")
        .forEach((link) => {

            link.addEventListener(
                "click",
                () => {

                    mainNavigation.classList.remove(
                        "is-open"
                    );


                    mobileMenuButton?.setAttribute(
                        "aria-expanded",
                        "false"
                    );


                    mobileMenuButton?.setAttribute(
                        "aria-label",
                        "Open navigation menu"
                    );


                    if (mobileMenuButton) {

                        mobileMenuButton.textContent =
                            "☰";
                    }

                }
            );

        });


    /* =====================================================
       IMAGE LIGHTBOX
       ===================================================== */

    function closeLightbox() {

        if (!lightbox) {
            return;
        }


        lightbox.hidden = true;


        document.body.classList.remove(
            "lightbox-open"
        );
    }


    function openLightbox() {

        if (
            !lightbox ||
            !lightboxImage ||
            !heroImage
        ) {
            return;
        }


        lightboxImage.src =
            heroImage.currentSrc ||
            heroImage.src;


        lightboxImage.alt =
            heroImage.alt ||
            "The Chen Fie Chinese";


        lightbox.hidden = false;


        document.body.classList.add(
            "lightbox-open"
        );
    }


    heroImage?.addEventListener(
        "click",
        openLightbox
    );


    lightbox?.addEventListener(
        "click",
        (event) => {

            if (
                event.target === lightbox ||
                event.target.closest(
                    "[data-close-lightbox]"
                )
            ) {

                closeLightbox();
            }

        }
    );


    /* =====================================================
       ESCAPE KEY
       ===================================================== */

    document.addEventListener(
        "keydown",
        (event) => {

            if (event.key !== "Escape") {
                return;
            }


            closeOptionModal();

            closeCart();

            closeLightbox();


            if (mainNavigation) {

                mainNavigation.classList.remove(
                    "is-open"
                );
            }


            mobileMenuButton?.setAttribute(
                "aria-expanded",
                "false"
            );


            if (mobileMenuButton) {

                mobileMenuButton.setAttribute(
                    "aria-label",
                    "Open navigation menu"
                );

                mobileMenuButton.textContent =
                    "☰";
            }

        }
    );


    /* =====================================================
       INITIAL STATE
       ===================================================== */

    updateOrderTypeFields();

    scheduleCartExpiry();

    updateCart();

});
