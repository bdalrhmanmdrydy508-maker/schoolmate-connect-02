

## خطة التعديل

### 1. إخفاء شريط التبويبات عند فتح قسم

عند اختيار قسم (`selectedSection !== null`)، يجب إخفاء `TabsList` (الإشعارات / ملفاتي / الأقسام المسندة) وعرض محتوى القسم مباشرة بدون تبويبات.

**التعديل في `src/pages/TeacherDashboard.tsx`:**
- نقل محتوى صفحة القسم (الجزء داخل `TabsContent value="sections"` عندما `selectedSection` موجود) خارج مكون `Tabs` بالكامل
- عند وجود `selectedSection`، لا يُعرض مكون `Tabs` إطلاقاً، بل يُعرض محتوى القسم مباشرة
- عند عدم وجود `selectedSection`، يُعرض `Tabs` كالمعتاد مع التبويبات الثلاثة

### 2. إصلاح أنواع الحصص

**التعديل في `src/pages/TeacherDashboard.tsx` (سطر 521):**
- حذف خيار `exam_correction` من القائمة المنسدلة

**التحقق:** الحقول الديناميكية (تاريخ التسليم / تاريخ الإرجاع) مرتبطة بالفعل بـ `lessonType === 'homework_correction'` فقط (سطر 569) - هذا صحيح ولا يحتاج تعديل.

### 3. تنظيف الترجمات

**التعديل في `src/i18n/translations/ar.ts`:**
- حذف مفتاح `lessonTypeExamCorrection`

### ملخص الملفات المتأثرة
- `src/pages/TeacherDashboard.tsx` - إعادة هيكلة لإخفاء التبويبات + حذف exam_correction
- `src/i18n/translations/ar.ts` - حذف ترجمة exam_correction

