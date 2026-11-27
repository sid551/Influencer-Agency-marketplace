-- Invitation routes were replaced by campaign-wise messaging. Keep the
-- legacy notification type for historical rows, but repoint their links to
-- a live route instead of a redirect shim.

update public.notifications
   set link_path = '/business/messages'
 where type = 'collaboration_invitation'
   and link_path = '/business/invitations';

-- Accepted applications now create collaborations/conversations; make sure
-- older message notifications still resolve to a live thread route (they
-- already do, but this guards seeded/legacy rows with relative paths).
update public.notifications
   set link_path = '/business/messages'
 where type = 'message'
   and link_path like '/business/invitations%';
