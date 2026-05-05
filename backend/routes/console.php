<?php

use Illuminate\Support\Facades\Artisan;

Artisan::command('crm:about', function () {
    $this->info('Healthcare CRM Dashboard API');
});
