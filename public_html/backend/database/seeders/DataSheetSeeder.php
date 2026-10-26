<?php

namespace Database\Seeders;

use App\Models\DataSheetCategory;
use Illuminate\Database\Seeder;

class DataSheetSeeder extends Seeder
{
    public function run(): void
    {
        if (DataSheetCategory::count() > 0) {
            return;
        }

        $c1 = DataSheetCategory::create(['name' => 'كتالوجات ومواصفات فنية', 'icon' => 'BookOpen']);
        DataSheetCategory::create(['name' => 'محركات كهربائية', 'parent_id' => $c1->id]);
        DataSheetCategory::create(['name' => 'إنفرترات ومتحكمات', 'parent_id' => $c1->id]);
        DataSheetCategory::create(['name' => 'ألواح وبطاريات طاقة شمسية', 'parent_id' => $c1->id]);

        $c2 = DataSheetCategory::create(['name' => 'مخططات ورسومات هندسية', 'icon' => 'Cpu']);
        DataSheetCategory::create(['name' => 'مخططات دوائر القوى', 'parent_id' => $c2->id]);
        DataSheetCategory::create(['name' => 'مخططات التحكم الآلي PLC', 'parent_id' => $c2->id]);

        $c3 = DataSheetCategory::create(['name' => 'أدلة التشغيل والصيانة', 'icon' => 'Wrench']);
        DataSheetCategory::create(['name' => 'دليل التركيب والتشغيل السريع', 'parent_id' => $c3->id]);
        DataSheetCategory::create(['name' => 'جدول الصيانة الدورية', 'parent_id' => $c3->id]);
    }
}
