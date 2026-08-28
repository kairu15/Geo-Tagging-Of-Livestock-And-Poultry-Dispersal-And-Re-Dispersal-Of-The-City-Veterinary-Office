from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0004_historicaluser"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="must_change_password",
            field=models.BooleanField(
                default=False,
                help_text="If True, user must set a new password before any other action.",
            ),
        ),
        migrations.AddField(
            model_name="historicaluser",
            name="must_change_password",
            field=models.BooleanField(
                default=False,
                help_text="If True, user must set a new password before any other action.",
            ),
        ),
    ]
