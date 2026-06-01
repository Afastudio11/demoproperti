import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Settings() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage application settings and user roles</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            User management is currently in development. You will be able to add users, assign roles, and manage permissions from this panel.
          </p>
          <Button disabled>Add New User</Button>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>System Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-medium text-sm">Theme Preference</h4>
                <p className="text-xs text-muted-foreground">Currently follows system settings</p>
              </div>
              <Button variant="outline" size="sm" disabled>Configure</Button>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-medium text-sm">Notification Settings</h4>
                <p className="text-xs text-muted-foreground">Manage email and dashboard alerts</p>
              </div>
              <Button variant="outline" size="sm" disabled>Configure</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
