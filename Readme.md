# Bsaraha Backend API

منصة الرسائل المجهولة - الواجهة الخلفية

## 📋 المحتويات

- [نظرة عامة](#نظرة-عامة)
- [الميزات](#الميزات)
- [المتطلبات](#المتطلبات)
- [التثبيت](#التثبيت)
- [الإعدادات](#الإعدادات)
- [تشغيل المشروع](#تشغيل-المشروع)
- [هيكل المشروع](#هيكل-المشروع)
- [API Documentation](#api-documentation)
- [قاعدة البيانات](#قاعدة-البيانات)
- [الأمان](#الأمان)
- [النشر](#النشر)

## 🔍 نظرة عامة

Bsaraha هي منصة للرسائل المجهولة تتيح للمستخدمين إرسال واستقبال الرسائل بشكل مجهول أو معرّف. تتضمن المنصة ميزات مثل المتابعة، والحظر، والإبلاغ، ولوحة تحكم إدارية شاملة.

## ✨ الميزات

### المستخدمين

- ✅ التسجيل وتسجيل الدخول
- ✅ تأكيد البريد الإلكتروني
- ✅ إعادة تعيين كلمة المرور
- ✅ إدارة الملف الشخصي
- ✅ رفع صورة الملف الشخصي

### الرسائل

- ✅ إرسال رسائل مجهولة أو معرّفة
- ✅ إرفاق الصور مع الرسائل
- ✅ الرد على الرسائل (عام أو خاص)
- ✅ حذف الرسائل
- ✅ إحصائيات الرسائل

### التفاعل الاجتماعي

- ✅ متابعة/إلغاء متابعة المستخدمين
- ✅ حظر/إلغاء حظر المستخدمين
- ✅ خلاصة الردود العامة
- ✅ البحث عن المستخدمين

### الإبلاغ والإدارة

- ✅ الإبلاغ عن المحتوى المسيء
- ✅ لوحة تحكم إدارية شاملة
- ✅ إدارة المستخدمين والمحتوى
- ✅ إحصائيات مفصلة

### الأمان

- ✅ تشفير كلمات المرور
- ✅ JWT للمصادقة
- ✅ Rate Limiting
- ✅ حماية من XSS و CSRF
- ✅ تنظيف المدخلات

## 📋 المتطلبات

- Node.js (النسخة 16 أو أحدث)
- MongoDB (Atlas أو محلي)
- npm أو yarn

## 🚀 التثبيت

1. **استنساخ المشروع**

```bash
git clone <repository-url>
cd bsaraha-backend
```

2. **تثبيت المكتبات**

```bash
npm install
```

3. **إعداد متغيرات البيئة**

```bash
cp .env.example .env
# قم بتعديل ملف .env بالقيم المناسبة
```

4. **إنشاء حساب المدير**

```bash
npm run create-admin
```

## ⚙️ الإعدادات

### ملف .env

```env
# Database
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/bsaraha

# JWT
JWT_SECRET=your-very-secure-jwt-secret

# Server
PORT=5000
NODE_ENV=development

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Email Service (Gmail example)
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@bsaraha.com

# Security
BCRYPT_ROUNDS=12

# Admin
DEFAULT_ADMIN_EMAIL=admin@bsaraha.com
DEFAULT_ADMIN_PASSWORD=Admin@123456
```

### إعداد خدمة البريد الإلكتروني

#### Gmail

1. تفعيل 2FA على حسابك
2. إنشاء App Password
3. استخدام البيانات في .env

#### SendGrid

```env
SENDGRID_API_KEY=your-sendgrid-api-key
```

#### Mailgun

```env
MAILGUN_API_KEY=your-mailgun-api-key
MAILGUN_DOMAIN=your-mailgun-domain
```

## 🏃‍♂️ تشغيل المشروع

### التطوير

```bash
npm run dev
```

### الإنتاج

```bash
npm start
```

### إنشاء المدير الأول

```bash
node scripts/createAdmin.js
```

## 📁 هيكل المشروع

```
bsaraha-backend/
├── config/
│   └── db.js                 # إعدادات قاعدة البيانات
├── middleware/
│   ├── auth.js               # وسطاء المصادقة
│   └── security.js           # وسطاء الأمان
├── models/
│   ├── User.js               # نموذج المستخدم
│   ├── Message.js            # نموذج الرسالة
│   ├── Follow.js             # نموذج المتابعة
│   ├── Block.js              # نموذج الحظر
│   └── Report.js             # نموذج البلاغ
├── routes/
│   ├── auth.js               # مسارات المصادقة
│   ├── users.js              # مسارات المستخدمين
│   ├── messages.js           # مسارات الرسائل
│   └── admin.js              # مسارات الإدارة
├── services/
│   └── emailService.js       # خدمة البريد الإلكتروني
├── scripts/
│   └── createAdmin.js        # إنشاء المدير
├── utils/
│   └── validation.js         # مساعدات التحقق
├── server.js                 # الخادم الرئيسي
├── package.json
├── .env
└── README.md
```

## 📚 API Documentation

بعد تشغيل الخادم، يمكنك الوصول لوثائق API من خلال:

```
http://localhost:5000/api-docs
```

### نقاط الوصول الرئيسية

#### المصادقة

- `POST /api/auth/register` - التسجيل
- `POST /api/auth/login` - تسجيل الدخول
- `POST /api/auth/verify-email` - تأكيد البريد
- `POST /api/auth/forgot-password` - نسيان كلمة المرور
- `POST /api/auth/reset-password` - إعادة تعيين كلمة المرور
- `GET /api/auth/me` - معلومات المستخدم الحالي
- `POST /api/auth/change-password` - تغيير كلمة المرور

#### المستخدمين

- `GET /api/users/:identifier` - معلومات المستخدم
- `PUT /api/users/profile` - تحديث الملف الشخصي
- `PUT /api/users/settings` - تحديث الإعدادات
- `POST /api/users/:userId/follow` - متابعة مستخدم
- `DELETE /api/users/:userId/unfollow` - إلغاء المتابعة
- `POST /api/users/:userId/block` - حظر مستخدم
- `DELETE /api/users/:userId/unblock` - إلغاء الحظر
- `GET /api/users/search` - البحث عن المستخدمين

#### الرسائل

- `POST /api/messages/send` - إرسال رسالة
- `GET /api/messages/inbox` - صندوق الوارد
- `PUT /api/messages/:messageId/read` - تمييز كمقروءة
- `POST /api/messages/:messageId/reply` - الرد على رسالة
- `DELETE /api/messages/:messageId` - حذف رسالة
- `GET /api/messages/feed` - خلاصة الردود
- `POST /api/messages/:messageId/report` - إبلاغ عن رسالة

#### الإدارة

- `GET /api/admin/stats` - إحصائيات عامة
- `GET /api/admin/users` - قائمة المستخدمين
- `PUT /api/admin/users/:userId/status` - تحديث حالة المستخدم
- `GET /api/admin/reports` - قائمة البلاغات
- `PUT /api/admin/reports/:reportId/review` - مراجعة بلاغ

## 🗄️ قاعدة البيانات

### النماذج

#### User

```javascript
{
  email: String,
  username: String,
  password: String,
  firstName: String,
  lastName: String,
  bio: String,
  profilePicture: String,
  isVerified: Boolean,
  isAdmin: Boolean,
  status: String, // active, blocked, banned
  messageLink: String,
  settings: {
    allowAnonymousMessages: Boolean,
    emailNotifications: Boolean
  }
}
```

#### Message

```javascript
{
  recipient: ObjectId,
  sender: ObjectId, // null for anonymous
  content: String,
  image: String,
  isAnonymous: Boolean,
  isRead: Boolean,
  reply: {
    content: String,
    isPublic: Boolean,
    createdAt: Date
  }
}
```

#### Follow

```javascript
{
  follower: ObjectId,
  following: ObjectId
}
```

#### Block

```javascript
{
  blocker: ObjectId,
  blocked: ObjectId,
  reason: String
}
```

#### Report

```javascript
{
  reporter: ObjectId,
  reportedUser: ObjectId,
  reportedMessage: ObjectId,
  type: String,
  description: String,
  screenshot: String,
  status: String // pending, reviewed, resolved, dismissed
}
```

## 🔒 الأمان

### الميزات الأمنية المطبقة

1. **تشفير كلمات المرور** باستخدام bcrypt
2. **JWT للمصادقة** مع انتهاء صلاحية
3. **Rate Limiting** لمنع الهجمات
4. **حماية من XSS** وتنظيف المدخلات
5. **CORS Policy** محدود للنطاقات المسموحة
6. **Helmet** لرؤوس الأمان
7. **تسجيل الأنشطة المشبوهة**
8. **حماية من NoSQL Injection**

### إعدادات Rate Limiting

- **عام**: 100 طلب كل 15 دقيقة
- **المصادقة**: 5 طلبات كل 15 دقيقة
- **الرسائل**: 10 رسائل كل دقيقة
- **إعادة تعيين كلمة المرور**: 3 طلبات كل ساعة
- **البحث**: 30 طلب كل دقيقة

## 🚀 النشر

### متطلبات النشر

1. **MongoDB Atlas** أو خادم MongoDB
2. **خدمة بريد إلكتروني** (SendGrid, Mailgun, Gmail)
3. **خادم Node.js** (Heroku, DigitalOcean, AWS, etc.)

### خطوات النشر على Heroku

1. **إنشاء تطبيق Heroku**

```bash
heroku create bsaraha-api
```

2. **إعداد متغيرات البيئة**

```bash
heroku config:set MONGO_URI=mongodb+srv://...
heroku config:set JWT_SECRET=your-secret
heroku config:set NODE_ENV=production
# ... باقي المتغيرات
```

3. **النشر**

```bash
git push heroku main
```

4. **إنشاء المدير**

```bash
heroku run node scripts/createAdmin.js
```

### خطوات النشر على VPS

1. **تثبيت Node.js و MongoDB**
2. **نسخ المشروع وتثبيت المكتبات**
3. **إعداد PM2 لإدارة العمليات**

```bash
npm install -g pm2
pm2 start server.js --name "bsaraha-api"
pm2 startup
pm2 save
```

4. **إعداد Nginx كـ Reverse Proxy**
5. **إعداد SSL Certificate**

## 🤝 المساهمة

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 الترخيص

هذا المشروع مرخص تحت رخصة MIT - انظر ملف [LICENSE](LICENSE) للتفاصيل.

## 📞 التواصل

- البريد الإلكتروني: support@bsaraha.com
- GitHub Issues: [المشاكل](https://github.com/yourusername/bsaraha-backend/issues)

## 🙏 شكر وتقدير

- Express.js Framework
- MongoDB & Mongoose
- JWT for Authentication
- All contributors and supporters

---

تم تطوير هذا المشروع بـ ❤️ للمجتمع العربي
