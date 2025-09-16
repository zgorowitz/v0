"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash2, ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { createClient, getCurrentUserOrganizationId } from '@/lib/supabase/client'

interface OrgUser {
  id: string
  user_id: string
  role: string
  invited_at: string
  joined_at: string | null
  user_email?: string
}

interface AllowedEmail {
  id: string
  organization_id: string
  email: string
  role: string
  added_by: string
  added_at: string
}

export default function OrganizationTab() {
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([])
  const [allowedEmails, setAllowedEmails] = useState<AllowedEmail[]>([])
  const [loading, setLoading] = useState(true)
  const [newEmail, setNewEmail] = useState('')
  const [addingEmail, setAddingEmail] = useState(false)
  const [deletingUser, setDeletingUser] = useState<string | null>(null)
  const [deletingAllowed, setDeletingAllowed] = useState<string | null>(null)
  const [updatingRole, setUpdatingRole] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchOrgUsers = useCallback(async () => {
    try {
      const organizationId = await getCurrentUserOrganizationId()
      if (!organizationId) {
        console.warn('No organization found for current user')
        setOrgUsers([])
        return
      }

      const { data, error } = await supabase
        .from('organization_users_with_emails')
        .select('*')
        .eq('organization_id', organizationId)
        .order('invited_at', { ascending: false })

      if (error) throw error
      setOrgUsers(data || [])
    } catch (error) {
      console.error('Error fetching organization users:', error)
      setError('Failed to load organization users')
    }
  }, [supabase])

  const fetchAllowedEmails = useCallback(async () => {
    try {
      const organizationId = await getCurrentUserOrganizationId()
      if (!organizationId) {
        setAllowedEmails([])
        return
      }

      const { data, error } = await supabase
        .from('allowed_emails')
        .select('*')
        .eq('organization_id', organizationId)
        .order('added_at', { ascending: false })

      if (error) throw error
      setAllowedEmails(data || [])
    } catch (error) {
      console.error('Error fetching allowed emails:', error)
      setError('Failed to load allowed emails')
    }
  }, [supabase])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchOrgUsers(), fetchAllowedEmails()])
      setLoading(false)
    }
    loadData()
  }, [fetchOrgUsers, fetchAllowedEmails])

  const addEmailToOrg = async () => {
    if (!newEmail.trim()) return

    setAddingEmail(true)
    setError(null)
    try {
      const { data: currentUser } = await supabase.auth.getUser()
      if (!currentUser.user) throw new Error('No authenticated user')

      const organizationId = await getCurrentUserOrganizationId()
      if (!organizationId) throw new Error('No organization found for current user')

      const { error } = await supabase
        .from('allowed_emails')
        .insert({
          organization_id: organizationId,
          email: newEmail.trim().toLowerCase(),
          role: 'manager',
          added_by: currentUser.user.id
        })

      if (error) throw error

      setNewEmail('')
      await Promise.all([fetchOrgUsers(), fetchAllowedEmails()])
    } catch (error: any) {
      console.error('Error adding email:', error)
      setError(error.message || 'Failed to add email')
    } finally {
      setAddingEmail(false)
    }
  }

  const deleteOrgUser = async (userId: string) => {
    setDeletingUser(userId)
    setError(null)
    try {
      const { error } = await supabase
        .from('organization_users')
        .delete()
        .eq('id', userId)

      if (error) throw error

      await fetchOrgUsers()
    } catch (error: any) {
      console.error('Error deleting user:', error)
      setError(error.message || 'Failed to delete user')
    } finally {
      setDeletingUser(null)
    }
  }

  const deleteAllowedEmail = async (emailId: string) => {
    setDeletingAllowed(emailId)
    setError(null)
    try {
      const { error } = await supabase
        .from('allowed_emails')
        .delete()
        .eq('id', emailId)

      if (error) throw error

      await fetchAllowedEmails()
    } catch (error: any) {
      console.error('Error deleting allowed email:', error)
      setError(error.message || 'Failed to delete email')
    } finally {
      setDeletingAllowed(null)
    }
  }

  const updateUserRole = async (userId: string, newRole: string) => {
    setUpdatingRole(userId)
    setError(null)
    try {
      const { error } = await supabase
        .from('organization_users')
        .update({ role: newRole })
        .eq('id', userId)

      if (error) throw error

      await fetchOrgUsers()
    } catch (error: any) {
      console.error('Error updating user role:', error)
      setError(error.message || 'Failed to update user role')
    } finally {
      setUpdatingRole(null)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-6">Organization Users</h2>
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-6">Organization Users</h2>

      {error && (
        <div className="mb-4 p-3 border border-red-200 bg-red-50 text-red-700 text-sm rounded">
          {error}
        </div>
      )}

      <div className="space-y-8">
        <div>
          <h3 className="text-sm font-medium mb-4">Add New User</h3>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="Enter user email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="flex-1 border-gray-200 focus:border-black"
            />
            <Button
              onClick={addEmailToOrg}
              disabled={addingEmail || !newEmail.trim()}
              className="bg-black hover:bg-gray-800 text-white"
            >
              {addingEmail ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                'Add User'
              )}
            </Button>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium mb-4">Current Users</h3>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {orgUsers.length === 0 ? (
              <div className="p-4 text-gray-500 text-sm">No users in the organization</div>
            ) : (
              orgUsers.map((user, index) => (
                <div key={user.id}>
                  <div className="flex justify-between items-center p-4">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{user.user_email || 'Email not available'}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        Invited: {new Date(user.invited_at).toLocaleDateString()}
                        {user.joined_at && ` • Joined: ${new Date(user.joined_at).toLocaleDateString()}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={updatingRole === user.id}
                            className="border-gray-200 hover:bg-gray-50"
                          >
                            {updatingRole === user.id ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-black"></div>
                            ) : (
                              <>
                                {user.role}
                                <ChevronDown className="ml-1 h-3 w-3" />
                              </>
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => updateUserRole(user.id, 'admin')}
                            disabled={user.role === 'admin'}
                          >
                            Admin
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => updateUserRole(user.id, 'manager')}
                            disabled={user.role === 'manager'}
                          >
                            Manager
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteOrgUser(user.id)}
                        disabled={deletingUser === user.id}
                        className="h-8 w-8 p-0 hover:bg-gray-100"
                      >
                        {deletingUser === user.id ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-black"></div>
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  {index < orgUsers.length - 1 && <div className="border-t border-gray-200" />}
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium mb-4">Pending Invitations</h3>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {allowedEmails.length === 0 ? (
              <div className="p-4 text-gray-500 text-sm">No pending invitations</div>
            ) : (
              allowedEmails.map((email, index) => (
                <div key={email.id}>
                  <div className="flex justify-between items-center p-4">
                    <div className="flex-1">
                      <div className="font-medium text-sm text-orange-700">{email.email}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        Role: {email.role} • Added: {new Date(email.added_at).toLocaleDateString()}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteAllowedEmail(email.id)}
                      disabled={deletingAllowed === email.id}
                      className="h-8 w-8 p-0 hover:bg-gray-100"
                    >
                      {deletingAllowed === email.id ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-black"></div>
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {index < allowedEmails.length - 1 && <div className="border-t border-gray-200" />}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}