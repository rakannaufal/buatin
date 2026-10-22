# Inventaris Komponen UI — {{projectName}}

> Dokumen ini mendefinisikan seluruh komponen UI yang digunakan dalam **{{projectName}}**.

---

## Ringkasan

{{brief}}

Komponen diorganisir menggunakan metodologi Atomic Design: atoms → molecules → organisms → templates → pages.

---

## Konvensi Penamaan

| Level    | Prefix         | Contoh                            |
| -------- | -------------- | --------------------------------- |
| Atom     | Tanpa prefix   | `Button`, `Input`, `Badge`        |
| Molecule | Gabungan atom  | `SearchBar`, `FormField`          |
| Organism | Section/widget | `Navbar`, `Footer`, `ProductCard` |
| Template | Layout         | `DashboardLayout`, `AuthLayout`   |

---

## Komponen Global (Atoms)

| Komponen     | Tujuan              | Props Utama                                         | Digunakan Di     |
| ------------ | ------------------- | --------------------------------------------------- | ---------------- |
| `Button`     | Aksi utama/sekunder | `variant`, `size`, `disabled`, `loading`, `onClick` | Seluruh halaman  |
| `Input`      | Input teks          | `type`, `placeholder`, `value`, `onChange`, `error` | Forms            |
| `TextArea`   | Input teks panjang  | `rows`, `maxLength`, `value`, `onChange`            | Forms            |
| `Select`     | Dropdown pilihan    | `options`, `value`, `onChange`, `placeholder`       | Forms, filters   |
| `Checkbox`   | Toggle boolean      | `checked`, `onChange`, `label`                      | Forms, settings  |
| `RadioGroup` | Pilihan tunggal     | `options`, `value`, `onChange`                      | Forms            |
| `Badge`      | Label status        | `variant`, `text`                                   | Lists, cards     |
| `Avatar`     | Foto profil         | `src`, `alt`, `size`, `fallback`                    | Header, cards    |
| `Icon`       | Ikon SVG            | `name`, `size`, `color`                             | Seluruh halaman  |
| `Spinner`    | Loading indicator   | `size`, `color`                                     | Async operations |
| `Skeleton`   | Placeholder loading | `width`, `height`, `variant`                        | Content loading  |
| `Tooltip`    | Info hover          | `content`, `position`                               | Ikon, label      |
| `Divider`    | Pemisah konten      | `orientation`, `spacing`                            | Layout           |

---

## Komponen Form (Molecules)

| Komponen        | Tujuan                        | Props Utama                                 | Digunakan Di       |
| --------------- | ----------------------------- | ------------------------------------------- | ------------------ |
| `FormField`     | Wrapper field + label + error | `label`, `error`, `required`, `children`    | Semua form         |
| `SearchBar`     | Input pencarian + tombol      | `placeholder`, `onSearch`, `value`          | Header, list pages |
| `DatePicker`    | Pilih tanggal                 | `value`, `onChange`, `min`, `max`           | Forms, filters     |
| `FileUpload`    | Upload file                   | `accept`, `maxSize`, `onUpload`, `multiple` | Upload forms       |
| `PasswordInput` | Input password + toggle       | `value`, `onChange`, `strength`             | Auth forms         |
| `PhoneInput`    | Input nomor telepon           | `value`, `onChange`, `countryCode`          | Registration       |
| `TagInput`      | Input tag/label               | `tags`, `onAdd`, `onRemove`, `suggestions`  | Content forms      |

---

## Komponen Layout (Organisms)

| Komponen        | Tujuan                | Props Utama                                 | Digunakan Di         |
| --------------- | --------------------- | ------------------------------------------- | -------------------- |
| `Navbar`        | Navigasi utama        | `logo`, `menuItems`, `user`                 | Semua halaman        |
| `Footer`        | Footer situs          | `links`, `social`, `copyright`              | Semua halaman        |
| `Sidebar`       | Navigasi samping      | `menuItems`, `collapsed`, `onToggle`        | Dashboard, admin     |
| `Breadcrumb`    | Navigasi breadcrumb   | `items`                                     | Halaman dalam        |
| `Tabs`          | Tab navigation        | `items`, `activeTab`, `onChange`            | Detail pages         |
| `Modal`         | Dialog overlay        | `isOpen`, `onClose`, `title`, `children`    | Konfirmasi, form     |
| `Drawer`        | Panel samping         | `isOpen`, `onClose`, `position`, `children` | Mobile menu, filters |
| `Toast`         | Notifikasi sementara  | `message`, `variant`, `duration`            | Feedback aksi        |
| `AlertDialog`   | Konfirmasi destruktif | `title`, `message`, `onConfirm`, `onCancel` | Delete, logout       |
| `Pagination`    | Navigasi halaman      | `total`, `current`, `perPage`, `onChange`   | List pages           |
| `EmptyState`    | State kosong          | `icon`, `title`, `description`, `action`    | List kosong          |
| `ErrorBoundary` | Error fallback        | `fallback`, `onReset`                       | Wrapper section      |

---

## Komponen Data Display

| Komponen    | Tujuan                   | Props Utama                              | Digunakan Di          |
| ----------- | ------------------------ | ---------------------------------------- | --------------------- |
| `DataTable` | Tabel data + sort/filter | `columns`, `data`, `sortable`, `onSort`  | Admin, list pages     |
| `Card`      | Container konten         | `title`, `children`, `footer`, `variant` | Dashboard, listing    |
| `StatCard`  | Metrik/angka             | `label`, `value`, `change`, `icon`       | Dashboard             |
| `Timeline`  | Urutan event             | `items`                                  | Order tracking, audit |
| `Accordion` | Konten collapsible       | `items`, `multiple`                      | FAQ, settings         |

{{#if hasAuth}}

---

## Komponen Autentikasi

| Komponen             | Tujuan                  | Props Utama                            | Digunakan Di       |
| -------------------- | ----------------------- | -------------------------------------- | ------------------ |
| `LoginForm`          | Form login              | `onSubmit`, `loading`, `error`         | `/login`           |
| `RegisterForm`       | Form registrasi         | `onSubmit`, `loading`, `error`         | `/register`        |
| `ForgotPasswordForm` | Form reset password     | `onSubmit`, `loading`, `success`       | `/forgot-password` |
| `UserMenu`           | Dropdown menu user      | `user`, `onLogout`                     | Navbar             |
| `AuthGuard`          | Wrapper protected route | `children`, `fallback`, `requiredRole` | Protected pages    |
| `SocialLoginButton`  | Login via provider      | `provider`, `onClick`                  | Login, register    |

{{/if}}

{{#if isEcommerce}}

---

## Komponen E-Commerce

| Komponen           | Tujuan                               | Props Utama                            | Digunakan Di         |
| ------------------ | ------------------------------------ | -------------------------------------- | -------------------- |
| `ProductCard`      | Kartu produk                         | `product`, `onAddToCart`, `onFavorite` | Katalog, search      |
| `ProductGallery`   | Galeri foto produk                   | `images`, `onSelect`                   | Product detail       |
| `ProductInfo`      | Info produk (nama, harga, deskripsi) | `product`                              | Product detail       |
| `QuantitySelector` | Pilih jumlah                         | `value`, `min`, `max`, `onChange`      | Cart, product detail |
| `PriceDisplay`     | Tampilkan harga + diskon             | `price`, `discountPrice`, `currency`   | Cards, detail        |
| `CartItem`         | Item di keranjang                    | `item`, `onQuantityChange`, `onRemove` | Cart page            |
| `CartSummary`      | Ringkasan belanja                    | `items`, `total`, `discount`           | Cart, checkout       |
| `CheckoutForm`     | Form checkout (alamat, payment)      | `onSubmit`, `loading`                  | Checkout             |
| `OrderStatusBadge` | Status pesanan                       | `status`                               | Order list/detail    |
| `CategoryFilter`   | Filter kategori                      | `categories`, `selected`, `onChange`   | Product listing      |
| `RatingStars`      | Rating bintang                       | `rating`, `count`, `interactive`       | Product, review      |

{{/if}}

{{#if isSaas}}

---

## Komponen SaaS

| Komponen         | Tujuan                    | Props Utama                          | Digunakan Di       |
| ---------------- | ------------------------- | ------------------------------------ | ------------------ |
| `PricingCard`    | Kartu paket harga         | `plan`, `current`, `onSelect`        | Pricing page       |
| `UsageBar`       | Progress penggunaan quota | `used`, `limit`, `label`             | Dashboard, billing |
| `OnboardingStep` | Step wizard onboarding    | `step`, `total`, `completed`         | Onboarding         |
| `TeamMemberRow`  | Baris anggota tim         | `member`, `onRemove`, `onRoleChange` | Team settings      |
| `InviteForm`     | Form undang anggota       | `onSubmit`, `roles`                  | Team settings      |
| `BillingHistory` | Riwayat pembayaran        | `invoices`                           | Billing page       |
| `FeatureGate`    | Batasi fitur per plan     | `feature`, `children`, `fallback`    | Seluruh app        |
| `ApiKeyCard`     | Tampilkan API key         | `apiKey`, `onRevoke`, `onRegenerate` | API settings       |

{{/if}}

{{#if isBooking}}

---

## Komponen Booking

| Komponen                | Tujuan                       | Props Utama                           | Digunakan Di      |
| ----------------------- | ---------------------------- | ------------------------------------- | ----------------- |
| `CalendarPicker`        | Pilih tanggal booking        | `available`, `selected`, `onChange`   | Booking form      |
| `TimeSlotGrid`          | Grid slot waktu              | `slots`, `selected`, `onSelect`       | Booking form      |
| `BookingCard`           | Kartu ringkasan booking      | `booking`, `onCancel`, `onReschedule` | My bookings       |
| `ServiceCard`           | Kartu layanan                | `service`, `onBook`                   | Service listing   |
| `BookingSummary`        | Ringkasan sebelum konfirmasi | `booking`, `onConfirm`                | Booking checkout  |
| `AvailabilityIndicator` | Indikator ketersediaan       | `available`, `total`                  | Calendar, listing |

{{/if}}

{{#if hasPayments}}

---

## Komponen Pembayaran

| Komponen                | Tujuan               | Props Utama                       | Digunakan Di      |
| ----------------------- | -------------------- | --------------------------------- | ----------------- |
| `PaymentMethodSelector` | Pilih metode bayar   | `methods`, `selected`, `onChange` | Checkout, payment |
| `PaymentSummary`        | Ringkasan pembayaran | `amount`, `items`, `tax`, `total` | Checkout          |
| `PaymentStatusCard`     | Status pembayaran    | `status`, `amount`, `date`        | Payment result    |
| `InvoiceView`           | Tampilan invoice     | `invoice`                         | Invoice detail    |

{{/if}}

{{#if hasCms}}

---

## Komponen CMS

| Komponen          | Tujuan                | Props Utama                      | Digunakan Di |
| ----------------- | --------------------- | -------------------------------- | ------------ |
| `RichTextEditor`  | Editor konten WYSIWYG | `content`, `onChange`, `toolbar` | Admin CMS    |
| `ArticleCard`     | Kartu artikel/blog    | `article`, `onClick`             | Blog listing |
| `ArticleContent`  | Render konten artikel | `content`, `toc`                 | Blog detail  |
| `CategoryBadge`   | Badge kategori        | `category`, `onClick`            | Blog cards   |
| `TableOfContents` | Daftar isi artikel    | `headings`                       | Blog detail  |

{{/if}}

{{#if hasNotifications}}

---

## Komponen Notifikasi

| Komponen           | Tujuan                  | Props Utama                          | Digunakan Di      |
| ------------------ | ----------------------- | ------------------------------------ | ----------------- |
| `NotificationBell` | Ikon notifikasi + badge | `count`, `onClick`                   | Navbar            |
| `NotificationList` | Daftar notifikasi       | `notifications`, `onRead`, `onClear` | Dropdown, page    |
| `NotificationItem` | Item notifikasi tunggal | `notification`, `onRead`             | Notification list |

{{/if}}

{{#if hasSearch}}

---

## Komponen Pencarian

| Komponen           | Tujuan                 | Props Utama                      | Digunakan Di    |
| ------------------ | ---------------------- | -------------------------------- | --------------- |
| `SearchOverlay`    | Modal pencarian global | `isOpen`, `onClose`, `onSearch`  | Header (Cmd+K)  |
| `SearchFilters`    | Panel filter pencarian | `filters`, `applied`, `onChange` | Search results  |
| `SearchResultItem` | Item hasil pencarian   | `result`, `onClick`, `highlight` | Search results  |
| `FilterChip`       | Chip filter aktif      | `label`, `onRemove`              | Search, listing |

{{/if}}

{{#if hasUploads}}

---

## Komponen Upload

| Komponen         | Tujuan                     | Props Utama                               | Digunakan Di   |
| ---------------- | -------------------------- | ----------------------------------------- | -------------- |
| `DropZone`       | Area drag & drop file      | `accept`, `maxSize`, `onDrop`, `multiple` | Upload forms   |
| `UploadProgress` | Progress bar upload        | `progress`, `fileName`, `onCancel`        | Upload process |
| `FilePreview`    | Preview file yang diupload | `file`, `onRemove`                        | Post-upload    |
| `ImageCropper`   | Crop gambar sebelum upload | `image`, `aspectRatio`, `onCrop`          | Avatar, banner |

{{/if}}

---

## Design Tokens

Komponen menggunakan design tokens yang konsisten:

| Token               | Nilai                | Penggunaan       |
| ------------------- | -------------------- | ---------------- |
| `--color-primary`   | `{{primaryColor}}`   | CTA, link, aksen |
| `--color-secondary` | `{{secondaryColor}}` | Elemen pendukung |
| `--font-heading`    | `{{headingFont}}`    | Heading h1-h6    |
| `--font-body`       | `{{bodyFont}}`       | Body text        |
| `--font-mono`       | `{{monoFont}}`       | Code, data       |
| `--radius-sm`       | `4px`                | Input, badge     |
| `--radius-md`       | `8px`                | Card, button     |
| `--radius-lg`       | `16px`               | Modal, drawer    |

---

## Catatan Implementasi

- Semua komponen harus mendukung **dark mode** (jika berlaku)
- Komponen form harus mendukung **validasi** dan **error state**
- Komponen interaktif harus mendukung **keyboard navigation** dan **ARIA attributes**
- Gunakan **lazy loading** untuk komponen berat (editor, chart, map)

> Daftar komponen akan berkembang seiring pengembangan **{{projectName}}**.
